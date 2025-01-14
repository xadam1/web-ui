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

import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {PreviewResultsColumn} from '../preview-results-table.component';

@Component({
  selector: 'preview-results-alternative-header',
  templateUrl: './preview-results-alternative-header.component.html',
  styleUrls: ['./preview-results-alternative-header.component.scss'],
  host: {class: 'alternative-header w-100'},
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewResultsAlternativeHeaderComponent {
  @Input()
  public columns: PreviewResultsColumn[];

  @Input()
  public columnWidth: number;

  @Input()
  public columnHeight: number;

  public trackByColumn(index: number, column: PreviewResultsColumn): string {
    return column.id;
  }
}
