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

import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, NavigationExtras, Router, RouterStateSnapshot} from '@angular/router';
import {select, Store} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {AppState} from '../store/app.state';
import {convertQueryModelToString} from '../store/navigation/query/query.converter';
import {Perspective} from '../../view/perspectives/perspective';
import {WorkspaceService} from '../../workspace/workspace.service';
import {Organization} from '../store/organizations/organization';
import {Project} from '../store/projects/project';
import {SearchTab} from '../store/navigation/search-tab';
import {View} from '../store/views/view';
import {selectSearchById} from '../store/searches/searches.state';
import {QueryParam} from '../store/navigation/query-param';
import {createSearchPerspectiveTabsByView} from '../store/views/view.utils';
import {cleanQueryFromHiddenAttributes} from '../store/navigation/query/query.util';
import {userPermissionsInView} from '../../shared/utils/permission.utils';
import {ResourcesGuardService} from '../../workspace/resources-guard.service';
import {User} from '../store/users/user';

@Injectable()
export class ViewRedirectGuard implements CanActivate {
  public constructor(
    private router: Router,
    private store$: Store<AppState>,
    private workspaceService: WorkspaceService,
    private resourcesGuardService: ResourcesGuardService
  ) {}

  public canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {
    const organizationCode = next.paramMap.get('organizationCode');
    const projectCode = next.paramMap.get('projectCode');
    const viewCode = next.paramMap.get('vc');
    const cursor = next.queryParamMap.get(QueryParam.ViewCursor);

    return this.workspaceService
      .selectOrGetUserAndWorkspace(organizationCode, projectCode)
      .pipe(
        mergeMap(({organization, project, user}) => this.canActivateView(organization, project, user, viewCode, cursor))
      );
  }

  private canActivateView(
    organization: Organization,
    project: Project,
    user: User,
    viewCode: string,
    cursor: string
  ): Observable<any> {
    return this.resourcesGuardService.selectViewByCode$(organization, project, viewCode).pipe(
      mergeMap(view => {
        const permissions = view && userPermissionsInView(organization, project, view, user);
        const perspective = view?.perspective ? view.perspective : Perspective.Search;
        const query = view
          ? convertQueryModelToString(
              cleanQueryFromHiddenAttributes(view.query, view.settings?.attributes, permissions)
            )
          : null;

        const viewPath: any[] = ['/w', organization.code, project.code, 'view'];
        if (viewCode) {
          viewPath.push({vc: viewCode});
        }
        viewPath.push(perspective);

        const extras: NavigationExtras = {queryParams: {[QueryParam.Query]: query, [QueryParam.ViewCursor]: cursor}};
        if (perspective === Perspective.Search) {
          return this.redirectToSearchPerspective(organization, project, user, view, viewPath, extras);
        }

        this.router.navigate(viewPath, extras);
        return of(false);
      })
    );
  }

  private redirectToSearchPerspective(
    organization: Organization,
    project: Project,
    user: User,
    view: View,
    viewPath: any[],
    extras?: NavigationExtras
  ): Observable<any> {
    return this.store$.pipe(
      select(selectSearchById(view?.code)),
      take(1),
      mergeMap(search =>
        this.resourcesGuardService.selectDefaultSearchTabs(organization, project, user).pipe(
          map(({tabs: defaultTabs}) => {
            const tabs = createSearchPerspectiveTabsByView(view, defaultTabs).filter(tab => !tab.hidden);
            const desiredTab = search?.config?.searchTab || view?.config?.search?.searchTab || SearchTab.All;
            if (tabs.some(tab => tab.id === desiredTab)) {
              return [...viewPath, desiredTab];
            }
            if (tabs.length) {
              return [...viewPath, tabs[0].id];
            }
            return viewPath;
          }),
          map(path => {
            this.router.navigate(path, extras);
            return false;
          })
        )
      )
    );
  }
}
