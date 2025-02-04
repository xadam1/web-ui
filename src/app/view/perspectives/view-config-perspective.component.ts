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

import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject, combineLatest, Observable, of, Subscription} from 'rxjs';
import {Collection} from '../../core/store/collections/collection';
import {LinkType} from '../../core/store/link-types/link.type';
import {Query} from '../../core/store/navigation/query/query';
import {select, Store} from '@ngrx/store';
import {AppState} from '../../core/store/app.state';
import {selectCurrentView, selectViewQuery} from '../../core/store/views/views.state';
import {filter, map, mergeMap, pairwise, startWith, switchMap, take, withLatestFrom} from 'rxjs/operators';
import {DefaultViewConfig, View, ViewConfig} from '../../core/store/views/view';
import {
  selectCollectionsByCustomViewAndQuery,
  selectLinkTypesInCustomViewAndQuery,
} from '../../core/store/common/permissions.selectors';
import {preferViewConfigUpdate} from '../../core/store/views/view.utils';
import {DEFAULT_PERSPECTIVE_ID} from './perspective';
import {selectNavigatingToOtherWorkspace} from '../../core/store/navigation/navigation.state';
import {selectCollectionsLoaded} from '../../core/store/collections/collections.state';
import {selectLinkTypesLoaded} from '../../core/store/link-types/link-types.state';

@Injectable()
export abstract class ViewConfigPerspectiveComponent<T> implements OnInit, OnDestroy {
  public config$: Observable<T>;

  public perspectiveId$ = new BehaviorSubject(DEFAULT_PERSPECTIVE_ID);

  protected subscriptions = new Subscription();

  protected constructor(protected store$: Store<AppState>) {}

  protected abstract subscribeConfig$(perspectiveId: string): Observable<T>;

  protected abstract configChanged(perspectiveId: string, config: T);

  protected abstract getConfig(viewConfig: ViewConfig): T;

  protected selectViewQuery$(): Observable<Query> {
    return this.store$.pipe(select(selectViewQuery));
  }

  protected selectCurrentView$(): Observable<View> {
    return this.store$.pipe(select(selectCurrentView));
  }

  protected getDefaultConfig(query: Query): T {
    return null;
  }

  protected selectDefaultViewConfig$(): Observable<DefaultViewConfig> {
    return of(null);
  }

  protected checkConfigWithDefaultView(config: T, defaultConfig?: DefaultViewConfig): Observable<T> {
    return of(config);
  }

  protected abstract checkOrTransformConfig(
    config: T,
    query: Query,
    collections: Collection[],
    linkTypes: LinkType[]
  ): T;

  public ngOnInit() {
    this.initPerspective();

    this.config$ = this.perspectiveId$
      .asObservable()
      .pipe(switchMap(perspectiveId => this.subscribeConfig$(perspectiveId)));
  }

  private initPerspective() {
    const subscription = this.selectCurrentView$()
      .pipe(
        startWith(null as View),
        pairwise(),
        switchMap(([previousView, view]) =>
          view ? this.subscribeToView(previousView, view) : this.subscribeToDefault()
        ),
        withLatestFrom(this.store$.pipe(select(selectNavigatingToOtherWorkspace))),
        filter(([, navigating]) => !navigating),
        map(([data]) => data)
      )
      .subscribe(({perspectiveId, config}: {perspectiveId?: string; config?: T}) => {
        if (perspectiveId) {
          this.perspectiveId$.next(perspectiveId);
          this.configChanged(perspectiveId, config);
        }
      });
    this.subscriptions.add(subscription);
  }

  private subscribeToView(previousView: View, view: View): Observable<{perspectiveId?: string; config?: T}> {
    const perspectiveId = view.code;
    return this.subscribeConfig$(perspectiveId).pipe(
      take(1),
      switchMap(entityConfig => {
        if (
          preferViewConfigUpdate(this.getConfig(previousView?.config), this.getConfig(view?.config), !!entityConfig)
        ) {
          return this.checkPerspectiveConfig(perspectiveId, view).pipe(
            mergeMap(checkedConfig => this.checkConfigWithDefaultView(checkedConfig)),
            map(config => ({perspectiveId, config}))
          );
        }
        return this.checkPerspectiveConfig(perspectiveId, view, this.getDefaultConfig(view.query), true).pipe(
          map(config => ({perspectiveId, config}))
        );
      })
    );
  }

  private checkPerspectiveConfig(
    perspectiveId: string,
    view?: View,
    defaultConfig?: T,
    preferStoreConfig?: boolean
  ): Observable<T> {
    const viewConfig = view && this.getConfig(view.config);
    return this.selectViewQuery$().pipe(
      switchMap(query =>
        combineLatest([
          this.store$.pipe(select(selectCollectionsByCustomViewAndQuery(view, query))),
          this.store$.pipe(select(selectLinkTypesInCustomViewAndQuery(view, query))),
        ]).pipe(map(([collections, linkTypes]) => ({query, collections, linkTypes})))
      ),
      withLatestFrom(
        this.subscribeConfig$(perspectiveId),
        this.store$.pipe(select(selectCollectionsLoaded)),
        this.store$.pipe(select(selectLinkTypesLoaded))
      ),
      filter(([, , collectionsLoaded, linkTypesLoaded]) => collectionsLoaded && linkTypesLoaded),
      map(([{query, collections, linkTypes}, config, ,], index) => {
        const perspectiveConfig = index > 0 || preferStoreConfig ? config || viewConfig : viewConfig || config;
        return this.checkOrTransformConfig(perspectiveConfig || defaultConfig, query, collections, linkTypes);
      })
    );
  }

  private subscribeToDefault(): Observable<{perspectiveId?: string; config?: T}> {
    const perspectiveId = DEFAULT_PERSPECTIVE_ID;
    return this.selectViewQuery$().pipe(
      switchMap(() =>
        this.selectDefaultViewConfig$().pipe(
          mergeMap(defaultView =>
            this.checkPerspectiveConfig(perspectiveId).pipe(
              mergeMap(checkedConfig => this.checkConfigWithDefaultView(checkedConfig, defaultView))
            )
          ),
          map(config => ({perspectiveId, config}))
        )
      )
    );
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
