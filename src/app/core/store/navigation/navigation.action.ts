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

import {Action} from '@ngrx/store';
import {Query} from './query/query';
import {ViewCursor} from './view-cursor/view-cursor';
import {PerspectiveSettings} from './settings/perspective-settings';
import {LanguageCode} from '../../model/language';

export enum NavigationActionType {
  ADD_LINK_TO_QUERY = '[Navigation] Add Link to Query',

  ADD_COLLECTION_TO_QUERY = '[Navigation] Add Collection to Query',

  NAVIGATE_TO_PREVIOUS_URL = '[Navigation] Navigate To Previous URL',

  SET_QUERY = '[Navigation] Set query',

  SET_VIEW_CURSOR = '[Navigation] Set View Cursor',

  SET_PERSPECTIVE_SETTINGS = '[Navigation] Set Perspective Settings',

  REDIRECT_TO_LANGUAGE = '[Navigation] Redirect To Language',

  REMOVE_VIEW_FROM_URL = '[Navigation] Remove view from URL',
}

export namespace NavigationAction {
  export class AddLinkToQuery implements Action {
    public readonly type = NavigationActionType.ADD_LINK_TO_QUERY;

    public constructor(public payload: {linkTypeId: string}) {}
  }

  export class AddCollectionToQuery implements Action {
    public readonly type = NavigationActionType.ADD_COLLECTION_TO_QUERY;

    public constructor(public payload: {collectionId: string}) {}
  }

  export class SetQuery implements Action {
    public readonly type = NavigationActionType.SET_QUERY;

    public constructor(public payload: {query: Query}) {}
  }

  export class SetViewCursor implements Action {
    public readonly type = NavigationActionType.SET_VIEW_CURSOR;

    public constructor(public payload: {cursor: ViewCursor; nextAction?: Action}) {}
  }

  export class SetPerspectiveSettings implements Action {
    public readonly type = NavigationActionType.SET_PERSPECTIVE_SETTINGS;

    public constructor(public payload: {settings: PerspectiveSettings}) {}
  }

  export class RemoveViewFromUrl implements Action {
    public readonly type = NavigationActionType.REMOVE_VIEW_FROM_URL;

    public constructor(public payload: {setQuery?: Query; cursor?: ViewCursor}) {}
  }

  export class RedirectToLanguage implements Action {
    public readonly type = NavigationActionType.REDIRECT_TO_LANGUAGE;

    public constructor(public payload: {language: LanguageCode}) {}
  }

  export class NavigateToPreviousUrl implements Action {
    public readonly type = NavigationActionType.NAVIGATE_TO_PREVIOUS_URL;

    constructor(
      public payload: {
        previousUrl: string;
        organizationCode: string;
        projectCode: string;
      }
    ) {}
  }
}
