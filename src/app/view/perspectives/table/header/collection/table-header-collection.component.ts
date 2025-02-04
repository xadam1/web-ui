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

import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {AppState} from '../../../../../core/store/app.state';
import {Collection} from '../../../../../core/store/collections/collection';
import {selectCollectionById} from '../../../../../core/store/collections/collections.state';
import {TableHeaderCursor} from '../../../../../core/store/tables/table-cursor';
import {TableConfigPart, TableModel} from '../../../../../core/store/tables/table.model';
import {TablesAction} from '../../../../../core/store/tables/tables.action';
import {AllowedPermissions} from '../../../../../core/model/allowed-permissions';
import {View} from '../../../../../core/store/views/view';
import {Query} from '../../../../../core/store/navigation/query/query';
import {selectCollectionPermissionsByView} from '../../../../../core/store/common/permissions.selectors';

@Component({
  selector: 'table-header-collection',
  templateUrl: './table-header-collection.component.html',
  styleUrls: ['./table-header-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableHeaderCollectionComponent implements OnChanges {
  @Input()
  public cursor: TableHeaderCursor;

  @Input()
  public part: TableConfigPart;

  @Input()
  public table: TableModel;

  @Input()
  public view: View;

  @Input()
  public query: Query;

  @Input()
  public canManageConfig: boolean;

  @Input()
  public embedded: boolean;

  public collection$: Observable<Collection>;
  public permissions$: Observable<AllowedPermissions>;

  public constructor(private store$: Store<AppState>) {}

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.part && this.part) {
      this.collection$ = this.store$.select(selectCollectionById(this.part.collectionId));
    }
    if ((changes.part || changes.view) && this.part) {
      this.permissions$ = this.store$.pipe(
        select(selectCollectionPermissionsByView(this.view, this.part.collectionId))
      );
    }
  }

  public onCaptionClick() {
    this.store$.dispatch(new TablesAction.SetCursor({cursor: null}));
  }
}
