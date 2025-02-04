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
import {SimpleChange} from '@angular/core';
import isEqual from 'lodash/isEqual';
import escape from 'lodash/escape';
import unescape from 'lodash/unescape';
import cloneDeep from 'lodash/cloneDeep';
import {removeAccentFromString} from '@lumeer/data-filters';

export function isNullOrUndefined(object: any): object is null | undefined {
  return object === null || object === undefined;
}

export function isNullOrUndefinedOrEmpty(object: any): object is null | undefined {
  return object === null || object === undefined || object === '';
}

export function isNotNullOrUndefined(object: any): boolean {
  return !isNullOrUndefined(object);
}

export function isNumeric(value: any): boolean {
  if (isNullOrUndefined(value) || typeof value === 'boolean' || String(value).trim() === '') {
    return false;
  }
  return !isNaN(toNumber(value));
}

export function toNumber(value: any): number {
  const val = value && value.toString().replace(/\s/g, '').replace(',', '.');

  return Number(val);
}

export function deepObjectsEquals(object1: any, object2: any): boolean {
  return isEqual(removeUndefinedProperties(object1), removeUndefinedProperties(object2));
}

function removeUndefinedProperties(value: any): any {
  if (isNullOrUndefined(value)) {
    return value;
  }
  if (isArray(value)) {
    return removeUndefinedPropertiesFromArray(value);
  } else if (isObject(value)) {
    return removeUndefinedPropertiesFromObject(value);
  }
  return value;
}

function removeUndefinedPropertiesFromArray(array: any[]): any[] {
  const returnArray = [];
  for (const element of array) {
    if (isNullOrUndefined(element)) {
      continue;
    }

    if (isArray(element)) {
      returnArray.push(removeUndefinedPropertiesFromArray(element));
    } else if (isObject(element)) {
      returnArray.push(removeUndefinedPropertiesFromObject(element));
    } else {
      returnArray.push(element);
    }
  }

  return returnArray;
}

function removeUndefinedPropertiesFromObject(object: any): any {
  const returnObj = {};
  Object.keys(object).forEach(key => {
    const val = object[key];
    if (isNotNullOrUndefined(val)) {
      if (isArray(val)) {
        returnObj[key] = removeUndefinedPropertiesFromArray(val);
      } else if (isObject(val)) {
        returnObj[key] = removeUndefinedPropertiesFromObject(val);
      } else {
        returnObj[key] = val;
      }
    }
  });
  return returnObj;
}

export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object';
}

export function deepObjectCopy<T>(object: T): T {
  return cloneDeep(object);
}

export function isArray<T>(input?: any): input is T[] {
  return Array.isArray(input);
}

export function isDateValid(date: Date): boolean {
  return date && date.getTime && !isNaN(date.getTime());
}

enum SuggestionScore {
  StartWith = 5,
  ContainsWord = 10,
  FullMatch = 20,
}

export function sortObjectsByScore<T>(objects: T[], text: string, params: string[]): T[] {
  const textLowerCase = removeAccentFromString(text || '').trim();
  const valuesArray = (objects || []).reduce<{object: T; score: number}[]>((array, object) => {
    const value = String(getValueFromObjectParams<T>(object, params));
    const valueLowerCase = removeAccentFromString(value).trim();
    if (valueLowerCase === textLowerCase) {
      array.push({object, score: SuggestionScore.FullMatch});
    } else if (valueLowerCase.split(' ').includes(textLowerCase)) {
      array.push({object, score: SuggestionScore.ContainsWord});
    } else if (valueLowerCase.startsWith(textLowerCase)) {
      array.push({object, score: SuggestionScore.StartWith});
    } else {
      array.push({object, score: 0});
    }
    return array;
  }, []);

  return valuesArray.sort((a, b) => b.score - a.score).map(v => v.object);
}

function getValueFromObjectParams<T>(object: T, params: string[]): any {
  if (!object) {
    return '';
  }

  for (let i = 0; i < (params || []).length; i++) {
    if (!object.hasOwnProperty(params[i])) {
      continue;
    }
    const value = object[params[i]];
    if (value || value === 0) {
      return value;
    }
  }
  return '';
}

export function objectsByIdMap<T extends {id?: string}>(objects: T[]): Record<string, T> {
  return (objects || []).reduce((map, object) => ({...map, [object.id]: object}), {});
}

/**
 * Returns the index of the last element in the array where predicate is true, and -1
 * otherwise.
 * @param array The source array to search in
 * @param predicate find calls predicate once for each element of the array, in descending
 * order, until it finds one where predicate returns true. If such an element is found,
 * findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.
 */
export function findLastIndex<T>(array: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean): number {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
}

export function findLastItem<T>(array: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean): T {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return array[l];
  }
  return null;
}

export function findIthItemIndex<T>(
  array: T[],
  num: number,
  predicate: (value: T, index: number, obj: T[]) => boolean
): number {
  let currentNum = 0;
  for (let i = 0; i < (array || []).length; i++) {
    if (predicate(array[i], i, array)) {
      currentNum++;
      if (currentNum === num) {
        return i;
      }
    }
  }
  return -1;
}

export function escapeHtml<T extends string | number>(value: T): T {
  const unescaped = unescapeHtml(value);
  return <T>(
    (typeof unescaped === 'number' ? unescaped : isNotNullOrUndefined(unescaped) ? escape(String(unescaped)) : null)
  );
}

export function unescapeHtml<T extends string | number>(value: T): T {
  return <T>(typeof value === 'number' ? value : isNotNullOrUndefined(value) ? unescape(String(value)) : null);
}

export function preventEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function objectValues<T>(object: Record<string, T>): T[] {
  // Object.values is not supported in older version of js
  return Object.keys(object || {}).map(key => object[key]);
}

export function computeElementPositionInParent(event: MouseEvent, parentTag: string): {x: number; y: number} {
  let x = event.offsetX;
  let y = event.offsetY;
  let element = event.target as HTMLElement;
  while (element && element.tagName.toLowerCase() !== parentTag) {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent as HTMLElement;
  }
  return {x, y};
}

export function objectChanged(change: SimpleChange): boolean {
  return change && (!change.previousValue || change.previousValue.id !== change.currentValue?.id);
}

export function getLastUrlPart(url: string): string {
  return (url || '').split('?')[0]?.split('/')?.pop();
}

export function bitTest(num: number, bit: number): boolean {
  return (num & (1 << bit)) > 0;
}

export function bitSet(num: number, bit: number) {
  return num | (1 << bit);
}

export function bitClear(num: number, bit: number) {
  return num & ~(1 << bit);
}
