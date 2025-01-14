/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Lumeer.io, s.r.o. and/or its affiliates.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Direction} from '../../../shared/direction';
import {copyAndSpliceArray} from '../../../shared/utils/array.utils';
import {findLinkInstanceByDocumentId, getOtherDocumentIdFromLinkInstance} from '../link-instances/link-instance.utils';
import {TableBodyCursor, TableHeaderCursor} from './table-cursor';
import {
  TableColumnType,
  TableConfig,
  TableConfigColumn,
  TableConfigPart,
  TableConfigRow,
  TableModel,
} from './table.model';
import {
  createEmptyTableRow,
  findTableRow,
  isValidHierarchicalRowOrder,
  mergeHiddenColumnsArray,
  moveTableColumn,
  replaceTableColumns,
  sortTableRowsByHierarchy,
  splitRowPath,
} from './table.utils';
import {TablesAction, TablesActionType} from './tables.action';
import {initialTablesState, tablesAdapter, TablesState} from './tables.state';

export function tablesReducer(state = initialTablesState, action: TablesAction.All): TablesState {
  switch (action.type) {
    case TablesActionType.ADD_TABLE:
      return tablesAdapter.upsertOne(action.payload.table, state);
    case TablesActionType.REMOVE_TABLE:
      return tablesAdapter.removeOne(action.payload.tableId, state);
    case TablesActionType.SET_CONFIG:
      return setConfig(state, action);
    case TablesActionType.ADD_PART:
      return addPart(state, action);
    case TablesActionType.REPLACE_COLUMNS:
      return replaceColumn(state, action);
    case TablesActionType.MOVE_COLUMN:
      return moveColumn(state, action);
    case TablesActionType.REMOVE_EMPTY_COLUMNS:
      return removeEmptyColumns(state, action);
    case TablesActionType.UPDATE_COLUMNS:
      return updateColumns(state, action.payload.cursor, () => action.payload.columns);
    case TablesActionType.ADD_PRIMARY_ROWS:
      return addPrimaryRows(state, action);
    case TablesActionType.ADD_LINKED_ROWS:
      return addLinkedRows(state, action);
    case TablesActionType.INIT_ROWS:
      return initRows(state, action);
    case TablesActionType.INIT_LINKED_ROWS:
      return initLinkedRows(state, action);
    case TablesActionType.CLEAN_ROWS:
      return cleanRows(state, action);
    case TablesActionType.ORDER_PRIMARY_ROWS:
      return orderPrimaryRows(state, action);
    case TablesActionType.REPLACE_ROWS:
      return replaceRows(state, action);
    case TablesActionType.REMOVE_ROW:
      return removeRow(state, action);
    case TablesActionType.REMOVE_ROWS:
      return removeRows(state, action);
    // case TablesActionType.TOGGLE_CHILD_ROWS:
    //   return toggleChildRows(state, action);
    case TablesActionType.TOGGLE_LINKED_ROWS:
      return toggleLinkedRows(state, action);
    case TablesActionType.MOVE_CURSOR:
      return {...state, moveCursorDown: action.payload.direction === Direction.Down};
    case TablesActionType.SET_CURSOR:
      return {...state, cursor: action.payload.cursor};
    case TablesActionType.SET_EDITED_ATTRIBUTE:
      return {...state, editedAttribute: action.payload.editedAttribute};
    default:
      return state;
  }
}

function setConfig(state: TablesState, action: TablesAction.SetConfig): TablesState {
  const {config} = action.payload;
  if (!config) {
    return state;
  }

  return tablesAdapter.updateOne({id: action.payload.tableId, changes: {config: action.payload.config}}, state);
}

function addPart(state: TablesState, action: TablesAction.AddPart): TablesState {
  const table = state.entities[action.payload.tableId];
  const parts = table.config.parts.concat(action.payload.parts);
  const config = {...table.config, parts};
  return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
}

function replaceColumn(state: TablesState, action: TablesAction.ReplaceColumns): TablesState {
  return updateColumns(state, action.payload.cursor, columns => {
    return replaceTableColumns(
      columns,
      action.payload.cursor.columnPath,
      action.payload.deleteCount,
      action.payload.columns
    );
  });
}

function moveColumn(state: TablesState, action: TablesAction.MoveColumn): TablesState {
  return updateColumns({...state, cursor: null}, action.payload.cursor, columns => {
    const fromPath = action.payload.cursor.columnPath;
    const toPath = fromPath.slice(0, fromPath.length - 1).concat(action.payload.toIndex);
    return moveTableColumn(columns, fromPath, toPath);
  });
}

function removeEmptyColumns(state: TablesState, action: TablesAction.RemoveEmptyColumns): TablesState {
  const {cursor} = action.payload;

  return updateColumns(state, cursor, columns => {
    return columns.filter(column => !(column.type === TableColumnType.COMPOUND && column.attributeIds.length === 0));
  });
}

function updateColumns(
  state: TablesState,
  cursor: TableHeaderCursor,
  transformation: (columns: TableConfigColumn[]) => TableConfigColumn[]
) {
  const {table, part} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const columns = mergeHiddenColumnsArray(transformation(part.columns));
  const parts: TableConfigPart[] = copyAndSpliceArray(table.config.parts, cursor.partIndex, 1, {...part, columns});
  const config = {...table.config, parts};

  return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
}

function addPrimaryRows(state: TablesState, action: TablesAction.AddPrimaryRows): TablesState {
  const {cursor, rows, append} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  return tablesAdapter.updateOne(
    {
      id: cursor.tableId,
      changes: {
        config: append ? appendPrimaryRows(table.config, cursor, rows) : insertPrimaryRows(table.config, cursor, rows),
      },
    },
    state
  );
}

function appendPrimaryRows(config: TableConfig, cursor: TableBodyCursor, rows: TableConfigRow[]): TableConfig {
  const existingRows = config.rows || [];
  const lastRow = existingRows[existingRows.length - 1];
  if (!lastRow || lastRow.documentId) {
    return {...config, rows: existingRows.concat(rows)};
  } else {
    return {
      ...config,
      rows: existingRows
        .slice(0, existingRows.length - 1)
        .concat(rows)
        .concat(createEmptyTableRow()),
    };
  }
}

function insertPrimaryRows(config: TableConfig, cursor: TableBodyCursor, rows: TableConfigRow[]): TableConfig {
  const updatedRows = [...config.rows];
  updatedRows.splice(cursor.rowPath[0], 0, ...rows);
  return {...config, rows: updatedRows};
}

function addLinkedRows(state: TablesState, action: TablesAction.AddLinkedRows): TablesState {
  const {cursor, linkedRows, append} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const config = {...table.config};

  if (append) {
    config.rows = updateRows(config.rows, cursor.rowPath, rows => rows.concat(linkedRows));
  } else {
    const {parentPath, rowIndex} = splitRowPath(cursor.rowPath);
    config.rows = updateRows(
      config.rows,
      parentPath,
      rows => {
        const updatedRows = [...rows];
        updatedRows.splice(rowIndex, 0, ...linkedRows);
        return updatedRows;
      },
      true
    );
  }

  return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
}

function initRows(state: TablesState, action: TablesAction.InitRows): TablesState {
  const {cursor, documents, linkInstances} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const rows = updateRows(table.config.rows, cursor.rowPath, oldRows => {
    const newRows = oldRows.map(row => {
      if (!row.correlationId) {
        return row;
      }

      const document = documents.find(doc => doc.correlationId === row.correlationId);
      if (!document) {
        return row;
      }

      const linkInstance = findLinkInstanceByDocumentId(linkInstances, document.id);
      return {
        ...row,
        correlationId: null,
        documentId: document.id,
        linkInstanceId: linkInstance && linkInstance.id,
        parentDocumentId: null,
      };
    });

    const lastRow = newRows[newRows.length - 1];
    if (cursor.partIndex === 0 && lastRow && lastRow.documentId) {
      return newRows.concat(createEmptyTableRow());
    }

    return newRows;
  });

  const config = {...table.config, rows};
  return tablesAdapter.updateOne({id: cursor.tableId, changes: {config}}, state);
}

function initLinkedRows(state: TablesState, action: TablesAction.InitLinkedRows): TablesState {
  const {cursor, linkInstances} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const rows = updateRows(table.config.rows, cursor.rowPath, oldRows =>
    oldRows.map(row => {
      if (!row.correlationId) {
        return row;
      }

      const linkInstance = linkInstances.find(link => link.correlationId === row.correlationId);
      if (!linkInstance) {
        return row;
      }

      const {documentId: linkedDocumentId} = findTableRow(table.config.rows, cursor.rowPath);
      const documentId = getOtherDocumentIdFromLinkInstance(linkInstance, linkedDocumentId);

      return {
        ...row,
        correlationId: null,
        documentId,
        linkInstanceId: linkInstance && linkInstance.id,
        parentDocumentId: null,
      };
    })
  );

  const config = {...table.config, rows};
  return tablesAdapter.updateOne({id: cursor.tableId, changes: {config}}, state);
}

function cleanRows(state: TablesState, action: TablesAction.CleanRows): TablesState {
  const {cursor, documents, linkInstances} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const rows = updateRows(table.config.rows, cursor.rowPath, oldRows => {
    return oldRows.reduce((cleanedRows, row) => {
      if (!row.documentId) {
        cleanedRows.push(row);
        return cleanedRows;
      }

      const document = documents.find(doc => doc.id === row.documentId);
      if (!document) {
        return cleanedRows;
      }

      if (row.linkInstanceId) {
        const linkInstance = linkInstances.find(instance => instance.id === row.linkInstanceId);
        if (!linkInstance) {
          return cleanedRows;
        }
      }

      cleanedRows.push(row);
      return cleanedRows;
    }, []);
  });

  const config = {...table.config, rows};
  return tablesAdapter.updateOne({id: cursor.tableId, changes: {config}}, state);
}

function orderPrimaryRows(state: TablesState, action: TablesAction.OrderPrimaryRows): TablesState {
  const {cursor, documents} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const documentsMap = documents.reduce((docsMap, document) => {
    if (document.id) {
      docsMap[document.id] = document;
    }
    return docsMap;
  }, {});

  if (isValidHierarchicalRowOrder(table.config.rows, documentsMap)) {
    return state;
  }

  const config = {...table.config, rows: sortTableRowsByHierarchy(table.config.rows, documentsMap)};
  return tablesAdapter.updateOne({id: cursor.tableId, changes: {config}}, state);
}

function replaceRows(state: TablesState, action: TablesAction.ReplaceRows): TablesState {
  const {cursor, rows: addedRows} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const {parentPath, rowIndex} = splitRowPath(cursor.rowPath);
  const rows = updateRows(table.config.rows, parentPath, updatedRows => {
    updatedRows.splice(rowIndex, action.payload.deleteCount, ...addedRows);
    return updatedRows;
  });

  const config = {...table.config, rows};
  return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
}

function updateRows(
  rows: TableConfigRow[],
  rowPath: number[],
  transformation: (rows: TableConfigRow[]) => TableConfigRow[],
  expand?: boolean
): TableConfigRow[] {
  if (rowPath.length === 0) {
    return transformation([...rows]);
  }

  const [index, ...childPath] = rowPath;
  const row = {
    ...rows[index],
    linkedRows: updateRows(rows[index].linkedRows, childPath, transformation, expand),
    expanded: expand || (rows[index] && rows[index].expanded),
  };

  const updatedRows = [...rows];
  updatedRows.splice(index, 1, row);
  return updatedRows;
}

export function removeRow(state: TablesState, action: TablesAction.RemoveRow): TablesState {
  const {cursor} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const rows = removeLinkedRow(table.config.rows, cursor.rowPath);
  const config = {...table.config, rows};
  return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
}

export function removeRows(state: TablesState, action: TablesAction.RemoveRows): TablesState {
  const {cursor, lastPathIndexes} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }

  const removeIndexes = [...lastPathIndexes].sort((a, b) => b - a);

  const rows = removeIndexes.reduce((currentRows, index) => {
    const cursorByIndex = {...cursor, rowPath: [...cursor.rowPath, index]};
    return removeLinkedRow(currentRows, cursorByIndex.rowPath);
  }, table.config.rows);

  const config = {...table.config, rows};
  return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
}

function removeLinkedRow(rows: TableConfigRow[], rowPath: number[]): TableConfigRow[] {
  const updatedRows = [...rows];
  const rowIndex = rowPath[0];

  if (rowPath.length === 1) {
    updatedRows.splice(rowIndex, 1);
    return updatedRows;
  }

  const row = {...rows[rowIndex]};
  row.linkedRows = removeLinkedRow(row.linkedRows, rowPath.slice(1));
  updatedRows.splice(rowIndex, 1, row);
  return updatedRows;
}

// function toggleChildRows(state: TablesState, action: TablesAction.ToggleChildRows): TablesState {
//   const {cursor} = action.payload;
//   const {table} = getTablePart(state, cursor);
//   const [rowIndex] = cursor.rowPath;
//
//   const rows = table.config.rows.map((row, index) => index === rowIndex ? {...row, collapsedChildren: !row.collapsedChildren} : row);
//
//   const config = {...table.config, rows};
//   return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
// }

function toggleLinkedRows(state: TablesState, action: TablesAction.ToggleLinkedRows): TablesState {
  const {cursor} = action.payload;
  const {table} = getTablePart(state, cursor);
  if (!table) {
    return state;
  }
  const {parentPath, rowIndex} = splitRowPath(cursor.rowPath);

  const rows = updateRows(table.config.rows, parentPath, updatedRows => {
    return updatedRows.map((row, index) => (index === rowIndex ? {...row, expanded: !row.expanded} : row));
  });

  const config = {...table.config, rows};
  return tablesAdapter.updateOne({id: table.id, changes: {config}}, state);
}

function getTablePart(state: TablesState, cursor: TableHeaderCursor): {table?: TableModel; part?: TableConfigPart} {
  const table = state.entities[cursor.tableId];
  if (!table) {
    return {};
  }
  const part = table.config && table.config.parts && table.config.parts[cursor.partIndex];
  return {table, part};
}
