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

import {createEntityAdapter, EntityState} from '@ngrx/entity';
import {createSelector} from '@ngrx/store';
import {DEFAULT_PERSPECTIVE_ID, Perspective} from '../../../view/perspectives/perspective';
import {AppState} from '../app.state';
import {selectCalendarConfig} from '../calendars/calendars.state';
import {selectChartConfig} from '../charts/charts.state';
import {selectAllCollections, selectCollectionsDictionary} from '../collections/collections.state';
import {selectDocumentsDictionary} from '../documents/documents.state';
import {selectGanttChartConfig} from '../gantt-charts/gantt-charts.state';
import {selectKanbanConfig} from '../kanbans/kanban.state';
import {selectLinkTypesDictionary} from '../link-types/link-types.state';
import {selectMapConfig} from '../maps/maps.state';
import {selectPerspective, selectRawQuery, selectViewCode} from '../navigation/navigation.state';
import {areQueriesEqual} from '../navigation/query/query.helper';
import {selectPivotConfig} from '../pivots/pivots.state';
import {selectTableConfig} from '../tables/tables.selector';
import {DefaultViewConfig, View, ViewGlobalConfig} from './view';
import {canChangeViewQuery, getViewColor, getViewIcon, isViewConfigChanged, viewAdditionalQueries} from './view.utils';
import {selectSearchConfig} from '../searches/searches.state';
import {selectWorkflowConfig} from '../workflows/workflow.state';
import {appendQueryFiltersByVisibleAttributes} from '../navigation/query/query.util';
import {selectDetailConfig} from '../details/detail.state';
import {CollectionPurpose, CollectionPurposeType} from '../collections/collection';
import {sortResourcesByFavoriteAndLastUsed} from '../../../shared/utils/resource.utils';
import {selectViewsPermissions} from '../user-permissions/user-permissions.state';
import {selectFormConfig} from '../form/form.state';

export interface ViewsState extends EntityState<View> {
  loaded: boolean;
  globalConfig: ViewGlobalConfig;
  defaultConfigs: Record<string, Record<string, DefaultViewConfig>>;
  defaultConfigsLoaded: boolean;
  defaultConfigSnapshot?: DefaultViewConfig;
}

export const viewsAdapter = createEntityAdapter<View>({selectId: view => view.id});

export const initialViewsState: ViewsState = viewsAdapter.getInitialState({
  loaded: false,
  globalConfig: {},
  defaultConfigs: {},
  defaultConfigsLoaded: false,
});

export const selectViewsState = (state: AppState) => state.views;

export const selectAllViews = createSelector(selectViewsState, viewsAdapter.getSelectors().selectAll);
export const selectAllViewsCount = createSelector(selectViewsState, viewsAdapter.getSelectors().selectTotal);
export const selectAllViewsSorted = createSelector(selectAllViews, views => sortResourcesByFavoriteAndLastUsed(views));
export const selectViewsDictionary = createSelector(selectViewsState, viewsAdapter.getSelectors().selectEntities);
export const selectViewByCode = (code: string) =>
  createSelector(selectAllViews, views => views.find(view => view.code === code));
export const selectViewById = (id: string) => createSelector(selectViewsDictionary, viewsMap => viewsMap[id]);

export const selectViewsDictionaryByCode = createSelector(selectAllViews, views =>
  views.reduce<Record<string, View>>((map, view) => ({...map, [view.code]: view}), {})
);

export const selectCurrentView = createSelector(selectViewCode, selectAllViews, (viewCode, views) =>
  viewCode ? views.find(view => view.code === viewCode) : null
);

export const selectDefaultDocumentView = (purpose: CollectionPurpose) =>
  createSelector(selectViewsDictionaryByCode, viewsDictionary => {
    if (purpose?.type === CollectionPurposeType.Tasks && purpose.metaData?.defaultViewCode) {
      return viewsDictionary[purpose.metaData.defaultViewCode];
    }
    return null;
  });

export const selectDefaultDocumentViews = (type: CollectionPurposeType) =>
  createSelector(selectViewsDictionaryByCode, selectAllCollections, (viewsDictionary, collections) =>
    collections
      .filter(collection => collection.purpose?.type === type)
      .map(collection => viewsDictionary[collection.purpose.metaData?.defaultViewCode])
      .filter(view => !!view)
  );

export const selectViewsLoaded = createSelector(selectViewsState, state => state.loaded);

export const selectDefaultViewConfigSnapshot = createSelector(selectViewsState, state => state.defaultConfigSnapshot);

const selectConfigs1 = createSelector(
  selectTableConfig,
  selectChartConfig,
  selectMapConfig,
  selectGanttChartConfig,
  selectCalendarConfig,
  selectKanbanConfig,
  selectPivotConfig,
  selectSearchConfig,
  (tableConfig, chartConfig, mapConfig, ganttChartConfig, calendarConfig, kanbanConfig, pivotConfig, searchConfig) => ({
    tableConfig,
    chartConfig,
    mapConfig,
    ganttChartConfig,
    calendarConfig,
    kanbanConfig,
    pivotConfig,
    searchConfig,
  })
);

const selectConfigs2 = createSelector(
  selectWorkflowConfig,
  selectDetailConfig,
  selectFormConfig,
  (workflowConfig, detailConfig, formConfig) => ({
    workflowConfig,
    detailConfig,
    formConfig,
  })
);

export const selectPerspectiveConfig = createSelector(
  selectPerspective,
  selectConfigs1,
  selectConfigs2,
  (
    perspective,
    {tableConfig, chartConfig, mapConfig, ganttChartConfig, calendarConfig, kanbanConfig, pivotConfig, searchConfig},
    {workflowConfig, detailConfig, formConfig}
  ) => ({
    [Perspective.Map]: mapConfig,
    [Perspective.Table]: tableConfig,
    [Perspective.Chart]: chartConfig,
    [Perspective.GanttChart]: ganttChartConfig,
    [Perspective.Calendar]: calendarConfig,
    [Perspective.Kanban]: kanbanConfig,
    [Perspective.Pivot]: pivotConfig,
    [Perspective.Search]: searchConfig,
    [Perspective.Workflow]: workflowConfig,
    [Perspective.Detail]: detailConfig,
    [Perspective.Form]: formConfig,
  })
);

export const selectViewAdditionalQueries = createSelector(
  selectPerspective,
  selectPerspectiveConfig,
  (perspective, config) => viewAdditionalQueries(perspective, config)
);

export const selectViewConfig = createSelector(selectCurrentView, view => view?.config);

export const selectViewsWithComputedData = createSelector(
  selectAllViews,
  selectCollectionsDictionary,
  (views, collectionsMap) =>
    views.map(view => ({...view, icon: getViewIcon(view), color: getViewColor(view, collectionsMap)}))
);

export const selectViewConfigChanged = createSelector(
  selectPerspective,
  selectViewConfig,
  selectPerspectiveConfig,
  selectDocumentsDictionary,
  selectCollectionsDictionary,
  selectLinkTypesDictionary,
  (perspective, viewConfig, perspectiveConfig, documentsMap, collectionsMap, linkTypesMap) =>
    isViewConfigChanged(perspective, viewConfig, perspectiveConfig, documentsMap, collectionsMap, linkTypesMap)
);

export const selectViewQuery = createSelector(
  selectCurrentView,
  selectRawQuery,
  selectViewsPermissions,
  (view, query, permissions) => {
    if (!canChangeViewQuery(view, permissions)) {
      return appendQueryFiltersByVisibleAttributes(view?.query, query, view?.settings?.attributes);
    }
    return query;
  }
);

export const selectViewQueryChanged = createSelector(
  selectCurrentView,
  selectViewQuery,
  (view, query) => view && query && !areQueriesEqual(view.query, query)
);

export const selectViewPerspectiveChanged = createSelector(
  selectCurrentView,
  selectPerspective,
  (view, perspective) => view && perspective && view.perspective !== perspective
);

const selectViewGlobalConfig = createSelector(selectViewsState, state => state.globalConfig);

export const selectSidebarOpened = createSelector(selectViewGlobalConfig, config => config.sidebarOpened);

export const selectPanelWidth = createSelector(selectViewGlobalConfig, config => config.panelWidth);

export const selectPerspectiveDefaultViewConfig = createSelector(
  selectViewsState,
  selectPerspective,
  selectViewQuery,
  (state, perspective, query) => {
    const firstStem = query?.stems?.[0];
    const collectionId = firstStem?.collectionId;
    const configsByPerspective = state.defaultConfigs?.[perspective];
    if (configsByPerspective && collectionId) {
      return configsByPerspective[collectionId];
    }
    return null;
  }
);

export const selectDefaultViewConfig = (perspective: Perspective, key: string) =>
  createSelector(selectViewsState, state => {
    const configsByPerspective = state.defaultConfigs[perspective] || {};
    return key && configsByPerspective[key];
  });

export const selectDefaultSearchPerspectiveConfig = createSelector(selectViewsState, viewsState => {
  const searchConfigs = viewsState.defaultConfigs[Perspective.Search] || {};
  return searchConfigs?.[DEFAULT_PERSPECTIVE_ID]?.config?.search;
});

export const selectDefaultSearchPerspectiveDashboardViewId = createSelector(
  selectDefaultSearchPerspectiveConfig,
  config => config?.dashboard?.viewId
);

export const selectDefaultSearchPerspectiveDashboardView = createSelector(
  selectDefaultSearchPerspectiveDashboardViewId,
  selectViewsDictionary,
  (viewId, map) => viewId && map[viewId]
);

export const selectDefaultViewConfigs = (perspective: Perspective, keys: string[]) =>
  createSelector(selectViewsState, state => {
    const configsByPerspective = state.defaultConfigs[perspective] || {};
    return keys.map(key => configsByPerspective[key]).filter(config => !!config);
  });

export const selectDefaultViewConfigsLoaded = createSelector(selectViewsState, state => state.defaultConfigsLoaded);
