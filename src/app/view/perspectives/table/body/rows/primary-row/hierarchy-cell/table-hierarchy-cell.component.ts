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

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {TableBodyCursor} from '../../../../../../../core/store/tables/table-cursor';
import {TableHierarchyCellMenuComponent} from './menu/table-hierarchy-cell-menu.component';
import {computeElementPositionInParent, preventEvent} from '../../../../../../../shared/utils/common.utils';
import {View} from '../../../../../../../core/store/views/view';

@Component({
  selector: 'table-hierarchy-cell',
  templateUrl: './table-hierarchy-cell.component.html',
  styleUrls: ['./table-hierarchy-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableHierarchyCellComponent implements OnChanges {
  @Input()
  public collapsible: boolean;

  @Input()
  public cursor: TableBodyCursor;

  @Input()
  public view: View;

  @Input()
  public level: number;

  @Input()
  public maxLevel: number;

  @Input()
  public canManageConfig: boolean;

  @Output()
  public toggle = new EventEmitter();

  @ViewChild(TableHierarchyCellMenuComponent, {static: true})
  public contextMenuComponent: TableHierarchyCellMenuComponent;

  public spacesBefore: any[] = [];
  public spacesAfter: any[] = [];

  public ngOnChanges(changes: SimpleChanges) {
    if (
      (changes.level || changes.maxLevel) &&
      (this.level || this.level === 0) &&
      (this.maxLevel || this.maxLevel === 0)
    ) {
      this.spacesBefore = new Array(this.level);
      this.spacesAfter = new Array(this.maxLevel - this.level);
    }
  }

  @HostListener('click')
  public onClick() {
    if (this.collapsible) {
      this.toggle.emit();
    }
  }

  public onContextMenu(event: MouseEvent) {
    const {x, y} = computeElementPositionInParent(event, 'table-hierarchy-cell');
    this.contextMenuComponent?.open(x, y);

    preventEvent(event);
  }
}
