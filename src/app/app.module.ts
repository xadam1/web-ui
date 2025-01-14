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

import {APP_INITIALIZER, LOCALE_ID, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {Angulartics2Module, Angulartics2Settings} from 'angulartics2';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {CollectionModule} from './collection/collection.module';
import {AuthModule} from './auth/auth.module';
import {CoreModule} from './core/core.module';
import {ViewModule} from './view/view.module';
import {WorkspaceModule} from './workspace/workspace.module';
import {SharedModule} from './shared/shared.module';
import {ConstraintDataService} from './core/service/constraint-data.service';
import {PermissionsCheckService} from './core/service/permissions-check.service';
import {AppIdService} from './core/service/app-id.service';
import {PrintModule} from './print/print.module';
import {ConfigurationService} from './configuration/configuration.service';
import {configuration} from '../environments/configuration';
import {TeamsLoadService} from './core/service/teams-load.service';
import {LinkTypeModule} from './link-type/link-type.module';
import {UserModule} from './user/user.module';
import {CurrentUserCheckService} from './core/service/current-user-check.service';

export const angularticsSettings: Partial<Angulartics2Settings> = {
  developerMode: !configuration.analytics,
  pageTracking: {
    clearIds: true,
    idsRegExp: new RegExp('^[0-9a-z]{24}$'),
  },
  ga: {
    anonymizeIp: true,
  },
};

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AuthModule,
    CoreModule,
    CollectionModule,
    LinkTypeModule,
    SharedModule,
    PrintModule,
    ViewModule,
    WorkspaceModule,
    UserModule,
    AppRoutingModule, // needs to be declared after all other routing modules
    Angulartics2Module.forRoot(angularticsSettings),
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (configurationService: ConfigurationService) => () => configurationService.loadConfiguration(),
      deps: [ConfigurationService],
      multi: true,
    },
    {
      provide: LOCALE_ID,
      deps: [ConfigurationService],
      useFactory: (configurationService: ConfigurationService) => configurationService.getConfiguration().locale,
    },
    ConstraintDataService,
    {
      provide: APP_INITIALIZER,
      useFactory: (constraintDataService: ConstraintDataService) => () => constraintDataService.init(),
      deps: [ConstraintDataService],
      multi: true,
    },
    PermissionsCheckService,
    {
      provide: APP_INITIALIZER,
      useFactory: (permissionsCheckService: PermissionsCheckService) => () => permissionsCheckService.init(),
      deps: [PermissionsCheckService],
      multi: true,
    },
    CurrentUserCheckService,
    {
      provide: APP_INITIALIZER,
      useFactory: (currentUserCheckService: CurrentUserCheckService) => () => currentUserCheckService.init(),
      deps: [CurrentUserCheckService],
      multi: true,
    },
    TeamsLoadService,
    {
      provide: APP_INITIALIZER,
      useFactory: (teamsLoadService: TeamsLoadService) => () => teamsLoadService.init(),
      deps: [TeamsLoadService],
      multi: true,
    },
    AppIdService,
    {
      provide: APP_INITIALIZER,
      useFactory: (appIdService: AppIdService) => () => appIdService.init(),
      deps: [AppIdService],
      multi: true,
    },
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
