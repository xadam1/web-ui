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
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {MatMenuTrigger} from '@angular/material/menu';
import {select, Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {first, map} from 'rxjs/operators';
import {selectCollectionsDictionary} from '../../../../../core/store/collections/collections.state';
import {NavigationAction} from '../../../../../core/store/navigation/navigation.action';
import {TableBodyCursor} from '../../../../../core/store/tables/table-cursor';
import {selectTableLastCollectionId} from '../../../../../core/store/tables/tables.selector';
import {Collection} from '../../../../../core/store/collections/collection';
import {LinkType} from '../../../../../core/store/link-types/link.type';
import {ModalService} from '../../../../../shared/modal/modal.service';
import {TableConfigPart} from '../../../../../core/store/tables/table.model';
import {sortResourcesByFavoriteAndLastUsed} from '../../../../../shared/utils/resource.utils';
import {AppState} from '../../../../../core/store/app.state';
import {AllowedPermissions} from '../../../../../core/model/allowed-permissions';
import {View} from '../../../../../core/store/views/view';
import {
  selectReadableCollectionsByView,
  selectReadableLinkTypesByView,
} from '../../../../../core/store/common/permissions.selectors';
import {Query} from '../../../../../core/store/navigation/query/query';

@Component({
  selector: 'table-header-add-button',
  templateUrl: './table-header-add-button.component.html',
  styleUrls: ['./table-header-add-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableHeaderAddButtonComponent implements OnChanges {
  @Input()
  public cursor: TableBodyCursor;

  @Input()
  public parts: TableConfigPart[];

  @Input()
  public permissions: AllowedPermissions;

  @Input()
  public canCreateLinks: boolean;

  @Input()
  public view: View;

  @Input()
  public query: Query;

  @Output()
  public addColumn = new EventEmitter();

  @ViewChild(MatMenuTrigger)
  public contextMenu: MatMenuTrigger;

  public collections$: Observable<Collection[]>;
  public collection$: Observable<Collection>;
  public linkTypes$: Observable<LinkType[]>;

  constructor(private modalService: ModalService, private element: ElementRef, private store$: Store<AppState>) {}

  public ngOnChanges(changes: SimpleChanges) {
    if ((changes.cursor || changes.view || changes.query) && this.cursor) {
      this.bindCollections(this.cursor);
      this.bindLinkTypes(this.cursor);
    }
  }

  private bindCollections(cursor: TableBodyCursor) {
    this.collections$ = combineLatest([
      this.store$.pipe(select(selectTableLastCollectionId(cursor.tableId))),
      this.store$.pipe(select(selectReadableCollectionsByView(this.view))),
    ]).pipe(
      map(([lastCollectionId, linkedCollections]) => {
        const filteredCollections = linkedCollections.filter(collection => collection.id !== lastCollectionId);
        return sortResourcesByFavoriteAndLastUsed(filteredCollections);
      })
    );
  }

  private bindLinkTypes(cursor: TableBodyCursor) {
    this.linkTypes$ = combineLatest([
      this.store$.pipe(select(selectReadableLinkTypesByView(this.view))),
      this.store$.pipe(select(selectCollectionsDictionary)),
      this.store$.pipe(select(selectTableLastCollectionId(cursor.tableId))),
    ]).pipe(
      map(([linkTypes, collectionsMap, lastCollectionId]) => {
        const linkTypeIds = this.query?.stems?.[0]?.linkTypeIds || [];
        return linkTypes
          .filter(linkType => !linkTypeIds.includes(linkType.id))
          .filter(linkType => linkType.collectionIds.some(id => id === lastCollectionId))
          .map(linkType => ({
            ...linkType,
            collections: [collectionsMap[linkType.collectionIds[0]], collectionsMap[linkType.collectionIds[1]]],
          }));
      })
    );
  }

  public onUseCollection(collection: Collection) {
    this.store$.pipe(select(selectTableLastCollectionId(this.cursor.tableId)), first()).subscribe(lastCollectionId => {
      this.modalService.showCreateLink([lastCollectionId, collection.id], null, linkType =>
        this.onUseLinkType(linkType)
      );
    });
  }

  public onUseLinkType(linkType: LinkType) {
    this.store$.dispatch(new NavigationAction.AddLinkToQuery({linkTypeId: linkType.id}));
  }

  public onAddColumn() {
    this.addColumn.emit();
  }

  public onClick(event: MouseEvent) {
    this.contextMenu?.closeMenu();
    event.stopPropagation();
  }
}
