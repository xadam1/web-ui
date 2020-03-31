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

import {GanttOptions, GanttSwimlaneInfo} from '@lumeer/lumeer-gantt/dist/model/options';
import {GanttSwimlane, GanttSwimlaneType, GanttTask} from '@lumeer/lumeer-gantt';
import * as moment from 'moment';
import {environment} from '../../../../../environments/environment';
import {COLOR_PRIMARY} from '../../../../core/constants';
import {AllowedPermissions} from '../../../../core/model/allowed-permissions';
import {Constraint} from '../../../../core/model/constraint';
import {UnknownConstraint} from '../../../../core/model/constraint/unknown.constraint';
import {ConstraintData, ConstraintType} from '../../../../core/model/data/constraint';
import {PercentageConstraintConfig} from '../../../../core/model/data/constraint-config';
import {AttributesResource, AttributesResourceType, DataResource} from '../../../../core/model/resource';
import {Collection} from '../../../../core/store/collections/collection';
import {
  findAttribute,
  findAttributeConstraint,
  isCollectionAttributeEditable,
  isLinkTypeAttributeEditable,
} from '../../../../core/store/collections/collection.util';
import {DocumentModel} from '../../../../core/store/documents/document.model';
import {
  GANTT_DATE_FORMAT,
  GanttChartBarModel,
  GanttChartConfig,
  GanttChartStemConfig,
} from '../../../../core/store/gantt-charts/gantt-chart';
import {LinkInstance} from '../../../../core/store/link-instances/link.instance';
import {LinkType} from '../../../../core/store/link-types/link.type';
import {Query} from '../../../../core/store/navigation/query/query';
import {SelectItemWithConstraintFormatter} from '../../../../shared/select/select-constraint-item/select-item-with-constraint-formatter.service';
import {contrastColor} from '../../../../shared/utils/color.utils';
import {
  isArray,
  isDateValid,
  isNotNullOrUndefined,
  isNullOrUndefined,
  isNumeric,
  objectsByIdMap,
  toNumber,
} from '../../../../shared/utils/common.utils';
import {stripTextHtmlTags} from '../../../../shared/utils/data.utils';
import {DataAggregatorAttribute, DataResourceChain} from '../../../../shared/utils/data/data-aggregator';
import {shadeColor} from '../../../../shared/utils/html-modifier';
import {aggregateDataValues, DataAggregationType} from '../../../../shared/utils/data/data-aggregation';
import {SelectConstraint} from '../../../../core/model/constraint/select.constraint';
import {Md5} from '../../../../shared/utils/md5';
import {canCreateTaskByStemConfig} from './gantt-chart-util';
import {createDatesInterval, parseDateTimeByConstraint} from '../../../../shared/utils/date.utils';
import {
  DataObjectAggregator,
  DataObjectAttribute,
  DataObjectInfo,
} from '../../../../shared/utils/data/data-object-aggregator';
import {QueryAttribute, queryAttributePermissions} from '../../../../core/model/query-attribute';

export interface GanttTaskMetadata {
  nameDataId: string;
  startDataId: string;
  endDataId: string;
  progressDataIds: string[];
  dataResourceChain: DataResourceChain[];
  swimlanesDataResourcesIds: string[];
  stemConfig: GanttChartStemConfig;
  swimlanes: GanttSwimlane[];
}

enum DataObjectInfoKeyType {
  Name = 'name',
  Start = 'start',
  End = 'end',
  Color = 'color',
  Progress = 'progress',
}

export class GanttChartConverter {
  private collectionsMap: Record<string, Collection>;
  private linkTypesMap: Record<string, LinkType>;
  private config: GanttChartConfig;
  private constraintData?: ConstraintData;
  private permissions: Record<string, AllowedPermissions>;
  private query: Query;

  private convertCount = 0;

  private dataObjectAggregator = new DataObjectAggregator<GanttSwimlane>(
    (value, constraint, data, aggregatorAttribute) =>
      this.formatDataAggregatorValue(value, constraint, data, aggregatorAttribute)
  );

  constructor(private formatter: SelectItemWithConstraintFormatter) {}

  public convert(
    config: GanttChartConfig,
    collections: Collection[],
    documents: DocumentModel[],
    linkTypes: LinkType[],
    linkInstances: LinkInstance[],
    permissions: Record<string, AllowedPermissions>,
    constraintData: ConstraintData,
    query: Query
  ): {options: GanttOptions; tasks: GanttTask[]} {
    this.updateData(config, collections, linkTypes, permissions, constraintData, query);

    const tasks = (query?.stems || [])
      .reduce((allTasks, stem, index) => {
        this.dataObjectAggregator.updateData(collections, documents, linkTypes, linkInstances, stem, constraintData);
        allTasks.push(...this.convertByStem(index));
        return allTasks;
      }, [])
      .sort((t1, t2) => this.compareTasks(t1, t2));

    const options = this.createGanttOptions(config);

    this.convertCount++;
    return {options, tasks};
  }

  private compareTasks(t1: GanttTask, t2: GanttTask): number {
    const t1Start = moment(t1.start, GANTT_DATE_FORMAT);
    const t2Start = moment(t2.start, GANTT_DATE_FORMAT);
    return t1Start.isAfter(t2Start) ? 1 : t1Start.isBefore(t2Start) ? -1 : 0;
  }

  private updateData(
    config: GanttChartConfig,
    collections: Collection[],
    linkTypes: LinkType[],
    permissions: Record<string, AllowedPermissions>,
    constraintData: ConstraintData,
    query: Query
  ) {
    this.config = config;
    this.collectionsMap = objectsByIdMap(collections);
    this.linkTypesMap = objectsByIdMap(linkTypes);
    this.permissions = permissions;
    this.constraintData = constraintData;
    this.query = query;
  }

  private createGanttOptions(config: GanttChartConfig): GanttOptions {
    const createTasks = (config.stemsConfigs || []).some(stemConfig =>
      canCreateTaskByStemConfig(stemConfig, this.permissions, this.linkTypesMap)
    );
    return {
      swimlaneInfo: this.convertSwimlaneInfo(config),
      resizeTaskRight: true,
      resizeProgress: true,
      resizeTaskLeft: true,
      resizeSwimlanes: true,
      dragTaskSwimlanes: true,
      createTasks,
      language: environment.locale,
      lockResize: config.lockResize || false,
      padding: config.padding,
      dateFormat: GANTT_DATE_FORMAT,
      columnWidth: config.columnWidth,
      barHeight: config.barHeight,
      initialScroll: config.positionSaved && config.position && this.convertCount === 0 ? config.position.value : null,
      viewMode: config.mode as any,
    };
  }

  private convertSwimlaneInfo(config: GanttChartConfig): GanttSwimlaneInfo[] {
    const categories = (config.stemsConfigs || []).reduce<GanttChartBarModel[][]>((arr, stemConfig) => {
      (stemConfig.categories || []).forEach((category, index) => {
        if (arr[index]) {
          arr[index].push(category);
        } else {
          arr[index] = [category];
        }
      });
      return arr;
    }, []);
    const categoriesLength = categories.length;

    if (config.showDates) {
      categories.push(
        (config.stemsConfigs || []).filter(stemConfig => !!stemConfig.start).map(stemConfig => stemConfig.start)
      );
      categories.push(
        (config.stemsConfigs || []).filter(stemConfig => !!stemConfig.end).map(stemConfig => stemConfig.end)
      );
    }

    return categories.map((cat, index) =>
      this.convertGanttBarToSwimlaneInfo(
        cat.length === 1 && cat[0],
        config.swimlaneWidths && config.swimlaneWidths[index],
        index >= categoriesLength
      )
    );
  }

  private convertGanttBarToSwimlaneInfo(
    model: GanttChartBarModel,
    width: number,
    isStatic: boolean
  ): GanttSwimlaneInfo {
    let title = '';
    let background = null;
    if (model) {
      const resource = this.getResource(model);
      background = shadeColor((<Collection>resource).color, 0.5);
      const attribute = resource && findAttribute(resource.attributes, model.attributeId);
      title = attribute && attribute.name;
    }
    return {
      background,
      color: COLOR_PRIMARY,
      static: isStatic,
      width,
      title,
    };
  }

  private convertByStem(index: number): GanttTask[] {
    const stemConfig = this.config?.stemsConfigs?.[index];
    if (this.requiredPropertiesAreSet(stemConfig)) {
      return this.convertByAggregation(stemConfig, this.config.showDates);
    }
    return [];
  }

  private convertByAggregation(stemConfig: GanttChartStemConfig, showDatesAsSwimlanes: boolean): GanttTask[] {
    const groupingAttributes = (stemConfig.categories || []).filter(category => !!category);
    const objectAttributes: DataObjectAttribute[] = [
      stemConfig.name && {...stemConfig.name, key: DataObjectInfoKeyType.Name},
      stemConfig.start && {...stemConfig.start, key: DataObjectInfoKeyType.Start},
      stemConfig.end && {...stemConfig.end, key: DataObjectInfoKeyType.End},
    ].filter(attribute => !!attribute);
    const metaAttributes: DataObjectAttribute[] = [
      stemConfig.color && {...stemConfig.color, key: DataObjectInfoKeyType.Color},
      stemConfig.progress && {
        ...stemConfig.progress,
        key: DataObjectInfoKeyType.Progress,
      },
    ].filter(attribute => !!attribute);

    const dataObjectsInfo = this.dataObjectAggregator.convert({
      groupingAttributes,
      objectAttributes,
      metaAttributes,
      objectsConverter: (value, attribute) => this.formatSwimlaneValue(value, attribute),
    });

    return this.createGanttTasksForStem(stemConfig, dataObjectsInfo, showDatesAsSwimlanes);
  }

  private createGanttTasksForStem(
    stemConfig: GanttChartStemConfig,
    dataObjectsInfo: DataObjectInfo<GanttSwimlane>[],
    showDatesAsSwimlanes: boolean
  ): GanttTask[] {
    const endEditable = this.isPropertyEditable(stemConfig.end);
    const endConstraint = stemConfig.end && this.findConstraintForModel(stemConfig.end);

    const validTaskIds = [];
    const validDataResourceIdsMap: Record<string, string[]> = dataObjectsInfo.reduce((map, item) => {
      const nameDataResource = item.objectDataResources[DataObjectInfoKeyType.Name];
      const startDataResource = item.objectDataResources[DataObjectInfoKeyType.Start];
      const endDataResource = item.objectDataResources[DataObjectInfoKeyType.End];

      const start = stemConfig.start && startDataResource && startDataResource.data[stemConfig.start.attributeId];
      const end = stemConfig.end && endDataResource && endDataResource.data[stemConfig.end.attributeId];
      if (isTaskValid(start, end, endConstraint)) {
        const id = helperDataId(item);
        validTaskIds.push(id);
        const dataResource = nameDataResource || startDataResource;
        const parentId = (<DocumentModel>dataResource).metaData && (<DocumentModel>dataResource).metaData.parentId;
        if (parentId) {
          if (map[parentId]) {
            map[parentId].push(id);
          } else {
            map[parentId] = [id];
          }
        }
      }
      return map;
    }, {});

    const nameConstraint = this.findConstraintForModel(stemConfig.name);

    const startEditable = this.isPropertyEditable(stemConfig.start);
    const startConstraint = this.findConstraintForModel(stemConfig.start);

    const progressEditable = this.isPropertyEditable(stemConfig.progress);
    const progressConstraint = this.findConstraintForModel(stemConfig.progress);

    const progressPermission = this.modelPermissions(stemConfig.progress);
    const startPermission = this.modelPermissions(stemConfig.start);
    const endPermission = this.modelPermissions(stemConfig.end);

    const dataModel = stemConfig.start || stemConfig.name;
    const canEditDependencies = dataModel && dataModel.resourceType === AttributesResourceType.Collection;

    return dataObjectsInfo.reduce<GanttTask[]>((arr, item) => {
      const nameDataResource = item.objectDataResources[DataObjectInfoKeyType.Name];
      const startDataResource = item.objectDataResources[DataObjectInfoKeyType.Start];
      const endDataResource = item.objectDataResources[DataObjectInfoKeyType.End];

      const progressDataResources = item.metaDataResources[DataObjectInfoKeyType.Progress] || [];
      const colorDataResources = item.metaDataResources[DataObjectInfoKeyType.Color] || [];

      const name = stemConfig.name && nameDataResource?.data[stemConfig.name.attributeId];
      const start = stemConfig.start && startDataResource?.data[stemConfig.start.attributeId];
      const end = stemConfig.end && endDataResource?.data[stemConfig.end.attributeId];

      if (!isTaskValid(start, end, endConstraint)) {
        return arr;
      }

      const interval = createInterval(start, startConstraint, end, endConstraint, this.constraintData);
      const progresses =
        (stemConfig.progress &&
          progressDataResources.map(dataResource => dataResource.data[stemConfig.progress.attributeId])) ||
        [];
      const dataAggregationType = (stemConfig.progress && stemConfig.progress.aggregation) || DataAggregationType.Avg;
      const progressRaw = aggregateDataValues(dataAggregationType, progresses, progressConstraint, true);
      const progress = progressConstraint.createDataValue(progressRaw).format();

      const resourceColor = this.getPropertyColor(stemConfig.name || stemConfig.start);
      const taskColor = this.parseColor(stemConfig.color, colorDataResources) || resourceColor;

      const datesSwimlanes: {value: any; title: string}[] = [];
      if (showDatesAsSwimlanes) {
        const startString = (this.findConstraintForModel(stemConfig.start) || new UnknownConstraint())
          .createDataValue(start, this.constraintData)
          .format();
        const endString = (this.findConstraintForModel(stemConfig.end) || new UnknownConstraint())
          .createDataValue(end, this.constraintData)
          .format();
        datesSwimlanes.push(
          ...[
            {value: startString, title: startString},
            {value: endString, title: endString},
          ]
        );
      }

      let minProgress,
        maxProgress = null;
      if (progressConstraint && progressConstraint.type === ConstraintType.Percentage) {
        const config = progressConstraint.config as PercentageConstraintConfig;
        minProgress = isNotNullOrUndefined(config.minValue) ? Math.max(0, config.minValue) : null;
        maxProgress = isNotNullOrUndefined(config.maxValue) ? config.maxValue : null;
      }

      const metadata: GanttTaskMetadata = {
        nameDataId: nameDataResource?.id,
        startDataId: interval.swapped ? endDataResource?.id : startDataResource?.id,
        endDataId: interval.swapped ? startDataResource?.id : endDataResource?.id,
        progressDataIds: (progressDataResources || []).map(dataResource => dataResource.id),
        swimlanesDataResourcesIds: (item.groupingDataResources || []).map(dataResource => dataResource.id),
        dataResourceChain: item.dataResourcesChain,
        swimlanes: [...(item.groupingObjects || [])],
        stemConfig: interval.swapped ? {...stemConfig, start: stemConfig.end, end: stemConfig.start} : stemConfig,
      };

      const names = isArray(name) ? name : [name];
      for (let i = 0; i < names.length; i++) {
        const nameFormatted = nameConstraint.createDataValue(names[i], this.constraintData).format();

        const taskId = helperDataId(item);
        const dataResourceId = (nameDataResource || startDataResource).id;
        arr.push({
          id: taskId,
          name: stripTextHtmlTags(nameFormatted, false),
          start: interval[0].value,
          end: interval[1].value,
          progress: createProgress(progress),
          dependencies: (canEditDependencies && validDataResourceIdsMap[dataResourceId]) || [],
          allowedDependencies: canEditDependencies ? validTaskIds.filter(id => id !== taskId) : [],
          barColor: shadeColor(taskColor, 0.5),
          progressColor: shadeColor(taskColor, 0.3),
          startDrag: startEditable && startPermission.writeWithView,
          endDrag: endEditable && endPermission.writeWithView,
          progressDrag: progressEditable && metadata.progressDataIds.length === 1 && progressPermission.writeWithView,
          editable: startPermission.writeWithView && endPermission.writeWithView,
          textColor: contrastColor(shadeColor(taskColor, 0.5)),
          swimlanes: [...(item.groupingObjects || []), ...datesSwimlanes],
          minProgress,
          maxProgress,

          metadata,
        });
      }

      return arr;
    }, []);
  }

  private parseColor(model: GanttChartBarModel, dataResources: DataResource[]): string {
    const constraint = this.findConstraintForModel(model);
    const values = (model && (dataResources || []).map(dataResource => dataResource.data[model.attributeId])) || [];
    return this.dataObjectAggregator.parseColor(constraint, values);
  }

  private isPropertyEditable(model: GanttChartBarModel): boolean {
    if (model && model.resourceType === AttributesResourceType.Collection) {
      const collection = this.collectionsMap[model.resourceId];
      return (
        collection &&
        isCollectionAttributeEditable(model.attributeId, collection, this.modelPermissions(model), this.query)
      );
    } else if (model && model.resourceType === AttributesResourceType.LinkType) {
      const linkType = this.linkTypesMap[model.resourceId];
      return (
        linkType && isLinkTypeAttributeEditable(model.attributeId, linkType, this.modelPermissions(model), this.query)
      );
    }

    return false;
  }

  private modelPermissions(model: GanttChartBarModel): AllowedPermissions {
    if (!model) {
      return {};
    }

    return queryAttributePermissions(model, this.permissions, this.linkTypesMap);
  }

  private getResource(model: GanttChartBarModel): AttributesResource {
    if (model.resourceType === AttributesResourceType.Collection) {
      return this.collectionsMap[model.resourceId];
    } else if (model.resourceType === AttributesResourceType.LinkType) {
      return this.linkTypesMap[model.resourceId];
    }

    return null;
  }

  private findConstraintForModel(model: QueryAttribute): Constraint {
    const resource = model && this.getResource(model);
    return (resource && findAttributeConstraint(resource.attributes, model.attributeId)) || new UnknownConstraint();
  }

  private getPropertyColor(model: QueryAttribute): string {
    const resource = this.dataObjectAggregator.getNextCollectionResource(model.resourceIndex);
    return resource && (<Collection>resource).color;
  }

  private requiredPropertiesAreSet(stemConfig: GanttChartStemConfig): boolean {
    return !!stemConfig.start && !!stemConfig.end;
  }

  private formatSwimlaneValue(value: any, barModel: QueryAttribute): GanttSwimlane | null {
    const constraint = this.findConstraintForModel(barModel);
    const overrideConstraint =
      barModel && barModel.constraint && this.formatter.checkValidConstraintOverride(constraint, barModel.constraint);

    const resultConstraint = overrideConstraint || constraint || new UnknownConstraint();
    const formattedValue = resultConstraint.createDataValue(value, this.constraintData).format();
    if (formattedValue) {
      if (resultConstraint.type === ConstraintType.Color) {
        return {background: formattedValue, value: formattedValue, title: ''};
      } else if (resultConstraint.type === ConstraintType.Boolean) {
        return {title: '', value: value, type: GanttSwimlaneType.Checkbox};
      }

      const textBackground = this.swimlaneBackground(value, resultConstraint);
      const textColor = textBackground && contrastColor(textBackground);
      return {
        value,
        title: formattedValue,
        textBackground,
        textColor,
        avatarUrl: this.swimlaneAvatarUrl(value, resultConstraint),
      };
    }
    return {value: '', title: ''};
  }

  private swimlaneBackground(value: any, constraint: Constraint): string {
    if (constraint.type === ConstraintType.Select) {
      const options = (<SelectConstraint>constraint).createDataValue(value).options;
      return options && options[0] && options[0].background;
    }
    return null;
  }

  private swimlaneAvatarUrl(value: any, constraint: Constraint): string {
    if (constraint.type === ConstraintType.User && isNotNullOrUndefined(value)) {
      const md5hash = Md5.hashStr(String(value || ''));
      return `https://www.gravatar.com/avatar/${md5hash}?r=g&d=retro`;
    }

    return null;
  }

  private formatDataAggregatorValue(
    value: any,
    constraint: Constraint,
    data: ConstraintData,
    aggregatorAttribute: DataAggregatorAttribute
  ): any {
    const ganttConstraint = aggregatorAttribute.data && (aggregatorAttribute.data as Constraint);
    const overrideConstraint =
      ganttConstraint && this.formatter.checkValidConstraintOverride(constraint, ganttConstraint);
    const finalConstraint = overrideConstraint || constraint || new UnknownConstraint();
    const dataValue = finalConstraint.createDataValue(value, data);

    switch (finalConstraint.type) {
      case ConstraintType.Select:
      case ConstraintType.User:
      case ConstraintType.Boolean:
        return dataValue.serialize();
      default:
        return dataValue.format();
    }
  }
}

function isTaskValid(start: string, end: string, endConstraint: Constraint): boolean {
  return areDatesValid(start, end, endConstraint);
}

function areDatesValid(start: string, end: string, endConstraint: Constraint): boolean {
  return isDateValidRange(start) && (isDateValidRange(end) || endConstraint.type === ConstraintType.Duration);
}

function isDateValidRange(dateString: string): boolean {
  const startDate = parseDateTimeByConstraint(dateString, null); // TODO
  const momentDate = startDate && moment(startDate);
  return isDateValid(startDate) && momentDate.year() > 1970 && momentDate.year() < 2200;
}

function createProgress(progress: any): number {
  if (isNullOrUndefined(progress)) {
    return 0;
  }

  const progressWithoutPercent = progress.toString().replace(/%*$/g, '');
  if (isNumeric(progressWithoutPercent)) {
    return Math.max(toNumber(progressWithoutPercent), 0);
  }
  return 0;
}

function createInterval(
  startString: string,
  startConstraint: Constraint,
  endString: string,
  endConstraint: Constraint,
  constraintData: ConstraintData
): {start: string; end?: string; swapped?: boolean} {
  const {start: startDate, end: endDate, swapped} = createDatesInterval(
    startString,
    startConstraint,
    endString,
    endConstraint,
    constraintData
  );
  return {
    start: moment(startDate).format(GANTT_DATE_FORMAT),
    end: moment(endDate).format(GANTT_DATE_FORMAT),
    swapped,
  };
}

function helperDataId(data: DataObjectInfo<GanttSwimlane>): string {
  const nameDataResource = data.objectDataResources[DataObjectInfoKeyType.Name];
  const startDataResource = data.objectDataResources[DataObjectInfoKeyType.Start];
  const endDataResource = data.objectDataResources[DataObjectInfoKeyType.End];
  return [nameDataResource, startDataResource, endDataResource]
    .filter(resource => isNotNullOrUndefined(resource))
    .map(resource => resource.id)
    .join(':');
}
