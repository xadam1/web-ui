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
import {PipesModule} from '../pipes/pipes.module';
import {PreviewResultsComponent} from './preview-results.component';
import {PreviewResultsTableComponent} from './table/preview-results-table.component';
import {PreviewResultsTabsComponent} from './tabs/preview-results-tabs.component';
import {DataInputModule} from '../data-input/data-input.module';
import {WarningMessageModule} from '../warning-message/warning-message.module';
import {PresenterModule} from '../presenter/presenter.module';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {TableModule} from '../table/table.module';
import {PreviewResultsAlternativeHeaderComponent} from './table/header/preview-results-alternative-header.component';
import {DirectivesModule} from '../directives/directives.module';
import {PreviewRangeStringPipe} from './table/pipes/preview-range-string.pipe';

@NgModule({
  imports: [
    CommonModule,
    DataInputModule,
    PipesModule,
    WarningMessageModule,
    PresenterModule,
    ScrollingModule,
    TableModule,
    DirectivesModule,
  ],
  declarations: [
    PreviewResultsComponent,
    PreviewResultsTableComponent,
    PreviewResultsTabsComponent,
    PreviewResultsAlternativeHeaderComponent,
    PreviewRangeStringPipe,
  ],
  exports: [PreviewResultsComponent, PreviewResultsTableComponent, PreviewResultsTabsComponent],
})
export class PreviewResultsModule {}
