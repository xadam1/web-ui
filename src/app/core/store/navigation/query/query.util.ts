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

import {AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators} from '@angular/forms';

import {
  AttributeFilter,
  ConditionType,
  conditionTypeNumberOfInputs,
  ConditionValue,
  ConstraintType,
  UnknownConstraint,
  UserConstraint,
  UserConstraintConditionValue,
  UserConstraintType,
} from '@lumeer/data-filters';
import {QueryItem} from '../../../../shared/top-panel/search-box/query-item/model/query-item';
import {QueryItemType} from '../../../../shared/top-panel/search-box/query-item/model/query-item-type';
import {CollectionAttributeFilter, LinkAttributeFilter, Query, QueryStem} from './query';
import {LinkType} from '../../link-types/link.type';
import {
  areArraysSame,
  arraySubtract,
  createRange,
  isArraySubset,
  uniqueValues,
} from '../../../../shared/utils/array.utils';
import {deepObjectsEquals, isNullOrUndefined} from '../../../../shared/utils/common.utils';
import {getOtherLinkedCollectionId} from '../../../../shared/utils/link-type.utils';
import {Attribute, Collection, CollectionPurposeType} from '../../collections/collection';
import {AttributesResource, AttributesResourceType} from '../../../model/resource';
import {AttributeQueryItem} from '../../../../shared/top-panel/search-box/query-item/model/attribute.query-item';
import {LinkAttributeQueryItem} from '../../../../shared/top-panel/search-box/query-item/model/link-attribute.query-item';
import {Workspace} from '../workspace';
import {MapPosition} from '../../maps/map.model';
import {formatMapCoordinates} from '../../maps/map-coordinates';
import {generateId, getAttributesResourceType} from '../../../../shared/utils/resource.utils';
import {QueryAttribute, QueryResource} from '../../../model/query-attribute';
import {COLOR_PRIMARY} from '../../../constants';
import {DataQuery} from '../../../model/data-query';
import {AllowedPermissions, AllowedPermissionsMap} from '../../../model/allowed-permissions';
import {normalizeQueryStem} from './query.converter';
import {CollectionQueryItem} from '../../../../shared/top-panel/search-box/query-item/model/collection.query-item';
import {FulltextQueryItem} from '../../../../shared/top-panel/search-box/query-item/model/fulltext.query-item';
import {LinkQueryItem} from '../../../../shared/top-panel/search-box/query-item/model/link.query-item';
import {AttributesSettings, ResourceAttributeSettings, View} from '../../views/view';
import {isAttributeVisibleInResourceSettings} from '../../../../shared/utils/attribute.utils';

export function queryItemToForm(queryItem: QueryItem): AbstractControl {
  switch (queryItem.type) {
    case QueryItemType.View:
    case QueryItemType.Document:
    case QueryItemType.Collection:
    case QueryItemType.Link:
      return new FormGroup({
        value: new FormControl(queryItem.value, Validators.required),
        text: new FormControl(queryItem.text, Validators.required),
      });
    case QueryItemType.Deleted:
    case QueryItemType.Fulltext:
      return new FormGroup({
        value: new FormControl(queryItem.value, Validators.required),
      });
    case QueryItemType.Attribute:
    case QueryItemType.LinkAttribute:
      return new FormGroup(
        {
          text: new FormControl(queryItem.text, Validators.required),
          condition: new FormControl(queryItem.condition),
          conditionValues: new FormArray(attributeConditionValuesForms(queryItem)),
          constraintType: new FormControl(queryItemConstraintType(queryItem)),
          fromSuggestion: new FormControl(queryItem.fromSuggestion),
        },
        attributeQueryValidator
      );
  }
}

export function isQueryItemEditable(
  index: number,
  queryItems: QueryItem[],
  canManageQuery: boolean,
  viewQuery: Query
): boolean {
  if (canManageQuery) {
    return true;
  }

  const queryItem = queryItems[index];
  const stemIndex = getStemIndexForQueryItems(index, queryItems);
  const sameItemsInStem = findSameItemsCountInStem(index, queryItems);
  const stem = viewQuery?.stems?.[stemIndex];
  const stemIndexQuery: Query = {stems: [stem].filter(s => !!s)};

  if (queryItem.type === QueryItemType.Attribute) {
    const collectionFilter = (<AttributeQueryItem>queryItem).getAttributeFilter();
    const sameFilters = getQueryFiltersForCollection(stemIndexQuery, collectionFilter.collectionId).filter(
      currentFilter => areFiltersEqual(collectionFilter, currentFilter)
    );
    return sameFilters.length <= sameItemsInStem;
  } else if (queryItem.type === QueryItemType.LinkAttribute) {
    const linkFilter = (<LinkAttributeQueryItem>queryItem).getLinkAttributeFilter();
    const sameFilters = getQueryFiltersForLinkType(stemIndexQuery, linkFilter.linkTypeId).filter(currentFilter =>
      areFiltersEqual(linkFilter, currentFilter)
    );
    return sameFilters.length <= sameItemsInStem;
  } else if (queryItem.type === QueryItemType.Collection) {
    const collectionId = (<CollectionQueryItem>queryItem).collection?.id;
    const sameCollectionIds = getBaseCollectionIdsFromQuery(viewQuery).filter(id => collectionId === id);
    return sameCollectionIds.length <= sameItemsInStem;
  }

  return false;
}

function getStemIndexForQueryItems(to: number, queryItems: QueryItem[]): number {
  return queryItems.slice(0, to + 1).filter(item => item.type === QueryItemType.Collection).length - 1;
}

function findSameItemsCountInStem(to: number, queryItems: QueryItem[]): number {
  let count = 0;
  const queryItem = queryItems[to];
  for (let i = to - 1; i >= 0; i--) {
    if (queryItems[i].type === QueryItemType.Collection) {
      break;
    }
    if (queryItemsAreSame(queryItems[i], queryItem)) {
      count++;
    }
  }
  return count;
}

function queryItemsAreSame(q1: QueryItem, q2: QueryItem): boolean {
  if (q1.type !== q2.type) {
    return false;
  }
  switch (q1.type) {
    case QueryItemType.Collection:
      return (<CollectionQueryItem>q1).collection.id === (<CollectionQueryItem>q2).collection.id;
    case QueryItemType.Link:
      return (<LinkQueryItem>q1).linkType.id === (<LinkQueryItem>q2).linkType.id;
    case QueryItemType.Attribute:
      return areFiltersEqual(
        (<AttributeQueryItem>q1).getAttributeFilter(),
        (<AttributeQueryItem>q2).getAttributeFilter()
      );
    case QueryItemType.LinkAttribute:
      return areFiltersEqual(
        (<LinkAttributeQueryItem>q1).getLinkAttributeFilter(),
        (<LinkAttributeQueryItem>q2).getLinkAttributeFilter()
      );
    case QueryItemType.Fulltext:
      return (<FulltextQueryItem>q1).value === (<FulltextQueryItem>q2).value;
  }
}

function queryItemConstraintType(queryItem: QueryItem): ConstraintType {
  const attribute = (<AttributeQueryItem>queryItem).attribute || (<LinkAttributeQueryItem>queryItem).attribute;
  return attribute?.constraint?.type || ConstraintType.Unknown;
}

function attributeConditionValuesForms(queryItem: QueryItem): FormGroup[] {
  return createRange(0, 2).map(index => {
    const conditionValue = queryItem.conditionValues?.[index];
    return new FormGroup({
      type: new FormControl(conditionValue?.type),
      value: new FormControl(conditionValue?.value),
    });
  });
}

function attributeQueryValidator(group: FormGroup): ValidationErrors | null {
  const condition = group.controls.condition.value;
  const conditionValue = group.controls.conditionValues.value;
  const constraintType = group.controls.constraintType.value;

  if (!condition) {
    return {emptyCondition: true};
  }

  if (!areConditionValuesDefined(condition, conditionValue, constraintType)) {
    return {emptyValue: true};
  }

  return null;
}

export function areConditionValuesDefined(
  condition: ConditionType,
  conditionValues: ConditionValue[],
  constraintType: ConstraintType
): boolean {
  return (
    condition &&
    createRange(0, conditionTypeNumberOfInputs(condition)).every(
      index => conditionValues[index] && isConditionValueDefined(conditionValues[index], condition, constraintType)
    )
  );
}

function isConditionValueDefined(value: ConditionValue, condition: ConditionType, type: ConstraintType): boolean {
  if (type === ConstraintType.Boolean) {
    return true;
  }
  switch (condition) {
    case ConditionType.Equals:
    case ConditionType.NotEquals:
    case ConditionType.IsEmpty:
    case ConditionType.NotEmpty:
      return true;
    default:
      return value.type || value.value;
  }
}

export function queryIsNotEmpty(query: Query): boolean {
  return queryIsNotEmptyExceptPagination(query) || !isNullOrUndefined(query.page) || !!query.pageSize;
}

export function queryIsEmpty(query: Query): boolean {
  return !queryIsNotEmpty(query);
}

export function queryIsNotEmptyExceptPagination(query: Query): boolean {
  return (query?.stems || []).length > 0 || (query?.fulltexts || []).length > 0;
}

export function queryIsEmptyExceptPagination(query: Query): boolean {
  return !queryIsNotEmptyExceptPagination(query);
}

export function isSingleCollectionQuery(query: Query): boolean {
  return query?.stems && query.stems.length === 1;
}

export function isAnyCollectionQuery(query: Query): boolean {
  return query?.stems && query.stems.length > 0;
}

export function queryItemsColor(queryItems: QueryItem[]): string {
  if (!queryItems || !queryItems.length || !queryItems[0].colors || !queryItems[0].colors.length) {
    return COLOR_PRIMARY;
  }

  return queryItems[0].colors[0];
}

export function filterQueryByStem(query: Query, filterStem: QueryStem): Query {
  if (!query || !filterStem) {
    return query;
  }
  const stems = query.stems?.filter(stem => queryStemsAreSame(stem, filterStem));
  return {...query, stems};
}

export function getQueryFiltersForResource(query: Query, id: string, type: AttributesResourceType): AttributeFilter[] {
  return (query?.stems || []).reduce((filters, stem) => {
    filters.push(...getQueryStemFiltersForResource(stem, id, type));
    return filters;
  }, []);
}

export function getQueryStemFiltersForResource(
  stem: QueryStem,
  id: string,
  type: AttributesResourceType
): AttributeFilter[] {
  if (type === AttributesResourceType.Collection) {
    return getQueryFiltersForCollection({stems: [stem]}, id);
  } else if (type === AttributesResourceType.LinkType) {
    return getQueryFiltersForLinkType({stems: [stem]}, id);
  }
  return [];
}

export function getQueryFiltersForCollection(query: Query, collectionId: string): CollectionAttributeFilter[] {
  return (query?.stems || []).reduce((filters, stem) => {
    const newFilters = (stem.filters || []).filter(
      filter => filter.collectionId === collectionId && !filters.find(f => areFiltersEqual(f, filter))
    );
    filters.push(...newFilters);
    return filters;
  }, []);
}

export function getQueryFiltersForLinkType(query: Query, linkTypeId: string): LinkAttributeFilter[] {
  return (query?.stems || []).reduce((filters, stem) => {
    const newFilters = (stem.linkFilters || []).filter(
      filter => filter.linkTypeId === linkTypeId && !filters.find(f => areFiltersEqual(f, filter))
    );
    filters.push(...newFilters);
    return filters;
  }, []);
}

export function areFiltersEqual(f1: AttributeFilter, f2: AttributeFilter): boolean {
  return deepObjectsEquals(f1, f2);
}

export function getAllLinkTypeIdsFromView(view: View): string[] {
  return uniqueValues([...getAdditionalLinkTypeIdsFromView(view), ...getAllLinkTypeIdsFromQuery(view?.query)]);
}

export function getAdditionalLinkTypeIdsFromView(view: View): string[] {
  const linkTypeIds = uniqueValues(
    (view?.additionalQueries || []).reduce((ids, query) => {
      ids.push(...getAllLinkTypeIdsFromQuery(query));
      return ids;
    }, [])
  );
  const queryLinkTypes = getAllLinkTypeIdsFromQuery(view.query);
  return arraySubtract(linkTypeIds, queryLinkTypes);
}

export function getAllLinkTypeIdsFromQuery(query: Query): string[] {
  return (query?.stems || []).reduce((ids, stem) => {
    (stem.linkTypeIds || []).forEach(linkTypeId => !ids.includes(linkTypeId) && ids.push(linkTypeId));
    return ids;
  }, []);
}

export function getAllCollectionIdsFromView(view: View, linkTypes: LinkType[]): string[] {
  return uniqueValues([
    ...getAdditionalCollectionIdsFromView(view, linkTypes),
    ...getAllCollectionIdsFromQuery(view?.query, linkTypes),
  ]);
}

export function getAdditionalCollectionIdsFromView(view: View, linkTypes: LinkType[]): string[] {
  const collectionIds = uniqueValues(
    (view?.additionalQueries || []).reduce((ids, query) => {
      ids.push(...getAllCollectionIdsFromQuery(query, linkTypes));
      return ids;
    }, [])
  );
  const queryCollectionIds = getAllLinkTypeIdsFromQuery(view.query);
  return arraySubtract(collectionIds, queryCollectionIds);
}

export function getAllCollectionIdsFromQuery(query: Query, linkTypes: LinkType[]): string[] {
  const basicCollectionIds = getBaseCollectionIdsFromQuery(query);
  const allLinkTypeIds = getAllLinkTypeIdsFromQuery(query);
  const filteredLinkTypes = (linkTypes || []).filter(linkType => allLinkTypeIds.includes(linkType.id));
  const collectionIdsFromLinks = filteredLinkTypes.reduce((ids, linkType) => {
    ids.push(...linkType.collectionIds);
    return ids;
  }, []);
  return uniqueValues<string>([...basicCollectionIds, ...collectionIdsFromLinks]);
}

export function getBaseCollectionIdsFromQuery(query: Query): string[] {
  return query?.stems?.map(stem => stem.collectionId) || [];
}

export function getBaseCollectionIdFromQuery(query: Query): string {
  return query?.stems?.[0]?.collectionId;
}

export function isQuerySubset(superset: Query, subset: Query, excludeLinksTypes?: boolean): boolean {
  if (!isArraySubset(superset?.fulltexts || [], subset?.fulltexts || [])) {
    return false;
  }

  if ((superset?.stems?.length || 0) > (subset?.stems?.length || 0)) {
    return false;
  }

  const subsetStems = [...(subset?.stems || [])];
  const unpairedStems = [];

  for (const stem of superset?.stems || []) {
    const stemIndex = subsetStems.findIndex(
      subsetStem => queryStemsAreSame(subsetStem, stem) && isQueryStemSubset(stem, subsetStem, excludeLinksTypes)
    );
    if (stemIndex >= 0) {
      subsetStems.splice(stemIndex, 1);
    } else {
      unpairedStems.push(stem);
    }
  }

  for (const stem of unpairedStems) {
    const subsetStem = subsetStems.find(s => s.collectionId === stem.collectionId);
    if (!subsetStem || !isQueryStemSubset(stem, subsetStem, excludeLinksTypes)) {
      return false;
    }
  }

  return true;
}

export function isQueryStemSubset(superset: QueryStem, subset: QueryStem, excludeLinksTypes?: boolean): boolean {
  return (
    superset.collectionId === subset.collectionId &&
    (excludeLinksTypes
      ? areArraysSame(superset.linkTypeIds || [], subset.linkTypeIds || [])
      : isArraySubset(superset.linkTypeIds || [], subset.linkTypeIds || [])) &&
    isArraySubset(superset.documentIds || [], subset.documentIds || []) &&
    isQueryFiltersSubset(superset.filters || [], subset.filters || []) &&
    isQueryLinkFiltersSubset(superset.linkFilters || [], subset.linkFilters || [])
  );
}

export function checkTasksCollectionsQuery(
  collections: Collection[],
  query: DataQuery,
  permissions: AllowedPermissionsMap
): DataQuery {
  if (queryIsEmptyExceptPagination(query)) {
    return tasksCollectionsQuery(collections, permissions);
  }
  return query;
}

export function tasksCollectionsQuery(collections: Collection[], permissions: AllowedPermissionsMap): Query {
  const stems = collections.map(collection => tasksCollectionQueryStem(collection, permissions)).filter(stem => !!stem);
  return {stems};
}

export function tasksCollectionQueryStem(collection: Collection, permissions: AllowedPermissionsMap): QueryStem {
  if (collection.purpose?.type === CollectionPurposeType.Tasks) {
    const assigneeAttributeId = collection.purpose?.metaData?.assigneeAttributeId;
    const assigneeAttribute = findAttribute(collection.attributes, assigneeAttributeId);
    if (assigneeAttribute) {
      return {
        collectionId: collection.id,
        filters: [
          {
            attributeId: assigneeAttribute.id,
            condition: ConditionType.HasSome,
            collectionId: collection.id,
            conditionValues: [{type: UserConstraintConditionValue.CurrentUser}],
          },
        ],
      };
    }
  } else if (permissions?.[collection.id]?.roles?.DataRead || permissions?.[collection.id]?.roles?.DataContribute) {
    return {collectionId: collection.id};
  }
  return null;
}

function isQueryFiltersSubset(superset: CollectionAttributeFilter[], subset: CollectionAttributeFilter[]): boolean {
  return subset.every(sub => superset.some(sup => areFiltersEqual(sub, sup)));
}

function isQueryLinkFiltersSubset(superset: LinkAttributeFilter[], subset: LinkAttributeFilter[]): boolean {
  return subset.every(sub => superset.some(sup => areFiltersEqual(sub, sup)));
}

export function queryContainsOnlyFulltexts(query: Query): boolean {
  return query && queryIsEmpty({...query, fulltexts: []}) && query?.fulltexts?.length > 0;
}

export function queryWithoutLinks(query: Query): Query {
  if (!query) {
    return query;
  }

  const stems = query.stems && query.stems.map(stem => ({...stem, linkTypeIds: []}));
  return {...query, stems};
}

export function queryWithoutFilters(query: Query): Query {
  if (!query) {
    return query;
  }

  const stems: QueryStem[] = query.stems?.map(stem => queryStemWithoutFilters(stem));
  return {...query, stems, fulltexts: []};
}

export function queryStemWithoutFilters(stem: QueryStem): QueryStem {
  return stem && {...stem, filters: [], linkFilters: []};
}

export function queryStemWithoutFiltersAndId(stem: QueryStem): QueryStem {
  return stem && {...queryStemWithoutFilters(stem), id: undefined};
}

export function queryStemsAreSameById(s1: QueryStem, s2: QueryStem): boolean {
  if (s1?.id && s2?.id) {
    return s1.id === s2.id;
  }
  return queryStemsAreSame(s1, s2);
}

export function queryStemsAreSame(s1: QueryStem, s2: QueryStem): boolean {
  return deepObjectsEquals(
    normalizeQueryStem(queryStemWithoutFiltersAndId(s1)),
    normalizeQueryStem(queryStemWithoutFiltersAndId(s2))
  );
}

export function uniqueStems(stems: QueryStem[]): QueryStem[] {
  return (stems || []).reduce((currentStems, currentStem) => {
    if (!currentStems.some(stem => queryStemsAreSame(stem, currentStem))) {
      currentStems.push(currentStem);
    }

    return currentStems;
  }, []);
}

export function filterStemByLinkIndex(stem: QueryStem, linkIndex: number, linkTypes: LinkType[]): QueryStem {
  const stemCopy = {...stem, linkTypeIds: stem.linkTypeIds.slice(0, linkIndex)};
  const notRemovedCollectionIds = collectionIdsChainForStem(stemCopy, linkTypes);

  stemCopy.filters = stem.filters?.filter(filter => notRemovedCollectionIds.includes(filter.collectionId));
  stemCopy.linkFilters = stem.linkFilters?.filter(filter => stem.linkTypeIds.includes(filter.linkTypeId));

  return stemCopy;
}

export function findStemIndexForCollection(query: Query, collectionId: string, linkTypes: LinkType[]): number {
  for (let i = (query.stems || []).length - 1; i >= 0; i--) {
    const collectionIds = collectionIdsChainForStem(query.stems[i], linkTypes);
    if (collectionIds.includes(collectionId)) {
      return i;
    }
  }

  return -1;
}

export function findStemIndexForLinkType(query: Query, linkTypeId: string): number {
  for (let i = (query.stems || []).length - 1; i >= 0; i--) {
    if ((query.stems[i].linkTypeIds || []).includes(linkTypeId)) {
      return i;
    }
  }

  return -1;
}

export function findStemIndexForLinkTypeToJoin(query: Query, linkType: LinkType, linkTypes: LinkType[]): number {
  for (let i = (query.stems || []).length - 1; i >= 0; i--) {
    const collectionIdsChain = collectionIdsChainForStem(query.stems[i], linkTypes);
    const lastCollectionId = collectionIdsChain[collectionIdsChain.length - 1];
    if (linkType.collectionIds.includes(lastCollectionId)) {
      return i;
    }
  }

  return -1;
}

export function collectionIdsChainForStem(stem: QueryStem, linkTypes: LinkType[]): string[] {
  if (!stem) {
    return [];
  }
  const chain = [stem.collectionId];
  for (const linkTypeId of stem.linkTypeIds || []) {
    const linkType = (linkTypes || []).find(lt => lt.id === linkTypeId);
    if (!linkType) {
      break;
    }

    const otherCollectionId = getOtherLinkedCollectionId(linkType, chain[chain.length - 1]);
    chain.push(otherCollectionId);
  }

  return chain;
}

export function queryStemAttributesResourcesOrder(
  stem: QueryStem,
  collections: Collection[],
  linkTypes: LinkType[]
): AttributesResource[] {
  const baseCollection = stem && (collections || []).find(collection => collection.id === stem.collectionId);
  if (!baseCollection) {
    return [];
  }
  const chain: AttributesResource[] = [{...baseCollection}];
  let previousCollection = baseCollection;
  for (let i = 0; i < (stem.linkTypeIds || []).length; i++) {
    const linkType = (linkTypes || []).find(lt => lt.id === stem.linkTypeIds[i]);
    const otherCollectionId = linkType && getOtherLinkedCollectionId(linkType, previousCollection.id);
    const otherCollection =
      otherCollectionId && (collections || []).find(collection => collection.id === otherCollectionId);

    if (otherCollection && linkType) {
      chain.push({...linkType, collections: [previousCollection, otherCollection]});
      chain.push({...otherCollection});
      previousCollection = otherCollection;
    } else {
      break;
    }
  }

  return chain;
}

export function findBestStemConfigIndex(
  stemsConfigs: {stem?: QueryStem}[],
  collectionIds: string[],
  linkTypes: LinkType[]
): number {
  for (let i = 0; i < stemsConfigs.length; i++) {
    const stemConfigCollectionIds = collectionIdsChainForStem(stemsConfigs[i].stem, linkTypes);
    if (isArraySubset(stemConfigCollectionIds, collectionIds)) {
      return i;
    }
  }
  for (let i = 0; i < stemsConfigs.length; i++) {
    const stemConfigCollectionIds = collectionIdsChainForStem(stemsConfigs[i].stem, linkTypes);
    if (collectionIds[0] === stemConfigCollectionIds[0]) {
      return i;
    }
  }

  return 0;
}

export function filterStemsForCollection(collectionId: string, query: DataQuery): DataQuery {
  if (query && (query.stems || []).length > 0) {
    return {
      ...query,
      stems: query.stems.filter(stem => stem.collectionId === collectionId),
      fulltexts: query.fulltexts,
    };
  } else {
    return {...query, stems: [{collectionId}]};
  }
}

export function isNavigatingToOtherWorkspace(workspace: Workspace, navigatingWorkspace: Workspace): boolean {
  if (!navigatingWorkspace || !workspace) {
    return false;
  }

  return (
    workspace.organizationCode !== navigatingWorkspace.organizationCode ||
    workspace.projectCode !== navigatingWorkspace.projectCode
  );
}

export function mapPositionPathParams(position: MapPosition): Record<string, any> {
  return {
    ...(position.bearing ? {mb: position.bearing.toFixed(1)} : undefined),
    ...(position.center ? {mc: formatMapCoordinates(position.center)} : undefined),
    ...(position.translate ? {mt: formatMapCoordinates(position.translate)} : undefined),
    ...(position.pitch ? {mp: position.pitch.toFixed(1)} : undefined),
    mz: position.zoom.toFixed(4),
  };
}

export function checkOrTransformQueryResource<T extends QueryResource>(
  queryResource: T,
  attributesResourcesOrder: AttributesResource[]
): T {
  if (!queryResource) {
    return queryResource;
  }

  const attributesResource = attributesResourcesOrder[queryResource.resourceIndex];
  if (
    attributesResource?.id === queryResource.resourceId &&
    getAttributesResourceType(attributesResource) === queryResource.resourceType
  ) {
    return queryResource;
  } else {
    const newAttributesResourceIndex = attributesResourcesOrder.findIndex(
      ar => ar.id === queryResource.resourceId && getAttributesResourceType(ar) === queryResource.resourceType
    );
    if (newAttributesResourceIndex >= 0) {
      return {...queryResource, resourceIndex: newAttributesResourceIndex};
    }
  }
  return null;
}

export function checkOrTransformQueryAttribute<T extends QueryAttribute>(
  queryAttribute: T,
  attributesResourcesOrder: AttributesResource[]
): T {
  if (!queryAttribute) {
    return queryAttribute;
  }

  const attributesResource = attributesResourcesOrder[queryAttribute.resourceIndex];
  if (
    attributesResource &&
    attributesResource.id === queryAttribute.resourceId &&
    getAttributesResourceType(attributesResource) === queryAttribute.resourceType
  ) {
    const attribute = findAttribute(attributesResource.attributes, queryAttribute.attributeId);
    if (attribute) {
      return queryAttribute;
    }
  } else {
    const newAttributesResourceIndex = attributesResourcesOrder.findIndex(
      ar => ar.id === queryAttribute.resourceId && getAttributesResourceType(ar) === queryAttribute.resourceType
    );
    if (newAttributesResourceIndex >= 0) {
      const attribute = findAttribute(
        attributesResourcesOrder[newAttributesResourceIndex].attributes,
        queryAttribute.attributeId
      );
      if (attribute) {
        return {...queryAttribute, resourceIndex: newAttributesResourceIndex};
      }
    }
  }
  return null;
}

function findAttribute(attributes: Attribute[], attributeId: string): Attribute {
  return (attributes || []).find(attr => attr.id === attributeId);
}

export function parseQueryParams(queryString: string) {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

export function appendQueryFiltersByVisibleAttributes(
  q1: Query,
  q2: Query,
  attributesSettings: AttributesSettings
): Query {
  if (!q1 || !q2) {
    return q1 || q2;
  }

  const stems = (q1.stems || []).map(stem => {
    const filters = [...(stem.filters || [])];
    const linkFilters = [...(stem.linkFilters || [])];

    const otherStem = q2.stems?.find(s => s.id === stem.id);
    if (otherStem) {
      const newFilters = (otherStem.filters || []).filter(filter => {
        const settings = attributesSettings?.collections?.[filter.collectionId];
        return shouldAppendVisibleFilter(filter, filters, settings);
      });
      filters.push(...newFilters);

      const newLinkFilters = (otherStem.linkFilters || []).filter(filter => {
        const settings = attributesSettings?.linkTypes?.[filter.linkTypeId];
        return shouldAppendVisibleFilter(filter, linkFilters, settings);
      });
      linkFilters.push(...newLinkFilters);
    }

    return {...stem, filters, linkFilters};
  });
  return {...q1, stems};
}

function shouldAppendVisibleFilter(
  filter: AttributeFilter,
  currentFilters: AttributeFilter[],
  settings: ResourceAttributeSettings[]
): boolean {
  if (settings?.some(s => s.attributeId === filter.attributeId && s.hidden)) {
    return false;
  }
  return !currentFilters.some(currentFilter => areFiltersEqual(currentFilter, filter));
}

export function cleanQueryFromHiddenAttributes(
  query: Query,
  attributesSettings: AttributesSettings,
  permissions: AllowedPermissions
): Query {
  if (permissions?.roles?.QueryConfig) {
    return query;
  }

  const stems = (query.stems || []).map(stem => {
    const filters = stem.filters?.filter(filter => {
      const settings = attributesSettings?.collections?.[filter.collectionId];
      return isAttributeVisibleInResourceSettings(filter.attributeId, settings);
    });
    const linkFilters = stem.linkFilters?.filter(filter => {
      const settings = attributesSettings?.linkTypes?.[filter.linkTypeId];
      return isAttributeVisibleInResourceSettings(filter.attributeId, settings);
    });

    return {...stem, filters, linkFilters};
  });

  return {...query, stems};
}

export function createCollectionQueryStem(collectionId: string, filters?: CollectionAttributeFilter[]): QueryStem {
  return {collectionId, id: generateId(), filters};
}

export function createOpenCollectionQuery(collection: Collection, query: Query): Query {
  const filters = getQueryFiltersForCollection(query, collection?.id);
  const stem =
    query.stems?.find(s => s.collectionId === collection?.id) || createCollectionQueryStem(collection?.id, filters);
  return {...query, stems: [stem]};
}

export function modifyAttributeForQueryBuilder(attribute: Attribute, condition: ConditionType): Attribute {
  const attributeWithoutLock = {...attribute, lock: null};
  switch (attribute?.constraint?.type) {
    case ConstraintType.Link:
      switch (condition) {
        case ConditionType.Contains:
        case ConditionType.NotContains:
          return {...attributeWithoutLock, constraint: new UnknownConstraint()};
      }
      return attributeWithoutLock;
    case ConstraintType.User:
      const userConstraint = <UserConstraint>attribute.constraint;
      return {
        ...attributeWithoutLock,
        constraint: new UserConstraint({...userConstraint.config, type: UserConstraintType.UsersAndTeams}),
      };
    default:
      return attributeWithoutLock;
  }
}
