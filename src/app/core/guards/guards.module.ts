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

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {CurrentUserGuard} from './current-user.guard';
import {CollectionsGuard} from './data/collections.guard';
import {LinkTypesGuard} from './data/link-types.guard';
import {ViewsGuard} from './data/views.guard';
import {PageNotFoundGuard} from './page-not-found.guard';
import {ViewRedirectGuard} from './view-redirect.guard';
import {UsersGuard} from './data/users.guard';
import {ViewDefaultConfigsGuard} from './data/view-default-configs.guard';
import {GroupsGuard} from './data/groups.guard';
import {ServiceLimitsGuard} from './data/service-limits.guard';
import {SelectionListsGuard} from './selection-lists.guard';
import {DashboardDataGuard} from './data/dashboard-data.guard';
import {ResourceVariablesGuard} from './data/resource-variables.guard';
import {OrganizationsProjectsGuard} from './data/organizations-projects.guard';

@NgModule({
  imports: [CommonModule],
  declarations: [],
  providers: [
    CollectionsGuard,
    LinkTypesGuard,
    PageNotFoundGuard,
    ViewsGuard,
    ViewRedirectGuard,
    CurrentUserGuard,
    UsersGuard,
    GroupsGuard,
    SelectionListsGuard,
    ServiceLimitsGuard,
    ViewDefaultConfigsGuard,
    DashboardDataGuard,
    ResourceVariablesGuard,
    OrganizationsProjectsGuard,
  ],
})
export class GuardsModule {}
