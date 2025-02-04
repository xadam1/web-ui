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

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WorkspaceUserComponent} from './workspace/workspace-user.component';
import {UserSettingsComponent} from './settings/user-settings.component';
import {UserSettingsHeaderComponent} from './settings/header/user-settings-header.component';
import {GravatarModule} from 'ngx-gravatar';
import {InputModule} from '../shared/input/input.module';
import {TopPanelModule} from '../shared/top-panel/top-panel.module';
import {RouterModule} from '@angular/router';
import {UserRoutingModule} from './user-routing.module';
import {UserResourcesComponent} from './settings/tab/resources/user-resources.component';
import {UserActivityComponent} from './settings/tab/activity/user-activity.component';
import {UsersModule} from '../shared/users/users.module';
import {WorkspaceUserResourcesComponent} from './workspace/resources/workspace-user-resources.component';
import {WorkspaceUserActivityComponent} from './workspace/activity/workspace-user-activity.component';
import {WorkspaceUserSettingsGuard} from './workspace/workspace-user-settings.guard';
import {WorkspaceUserTabGuard} from './workspace/workspace-user-tab.guard';
import {UserCollectionsComponent} from './settings/tab/resources/collections/user-collections.component';
import {UserLinkTypesComponent} from './settings/tab/resources/link-types/user-link-types.component';
import {UserViewsComponent} from './settings/tab/resources/views/user-views.component';
import {RolesModule} from '../shared/roles/roles.module';
import {PresenterModule} from '../shared/presenter/presenter.module';
import {UserResourcesListComponent} from './settings/tab/resources/list/user-resources-list.component';
import {ResourceActivityModule} from '../shared/resource/activity/resource-activity.module';
import {SelectModule} from '../shared/select/select.module';
import {UserProjectsComponent} from './workspace/resources/projects/user-projects.component';
import {WorkspaceUserCleanUpGuard} from './workspace/workspace-user-clean-up.guard';

@NgModule({
  declarations: [
    UserSettingsComponent,
    WorkspaceUserComponent,
    UserSettingsHeaderComponent,
    UserResourcesComponent,
    UserActivityComponent,
    WorkspaceUserResourcesComponent,
    WorkspaceUserActivityComponent,
    UserCollectionsComponent,
    UserLinkTypesComponent,
    UserViewsComponent,
    UserResourcesListComponent,
    UserProjectsComponent,
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    GravatarModule,
    InputModule,
    TopPanelModule,
    RouterModule,
    UsersModule,
    RolesModule,
    PresenterModule,
    ResourceActivityModule,
    SelectModule,
  ],
  providers: [WorkspaceUserSettingsGuard, WorkspaceUserTabGuard, WorkspaceUserCleanUpGuard],
})
export class UserModule {}
