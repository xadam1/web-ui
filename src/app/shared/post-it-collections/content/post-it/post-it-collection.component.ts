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
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {Collection} from '../../../../core/store/collections/collection';
import {Workspace} from '../../../../core/store/navigation/workspace';
import {convertQueryModelToString} from '../../../../core/store/navigation/query/query.converter';
import {Query} from '../../../../core/store/navigation/query/query';
import {IconColorPickerComponent} from '../../../picker/icon-color/icon-color-picker.component';
import {Router} from '@angular/router';
import {Perspective} from '../../../../view/perspectives/perspective';
import {AppState} from '../../../../core/store/app.state';
import {select, Store} from '@ngrx/store';
import {AllowedPermissions} from '../../../../core/model/allowed-permissions';
import {Observable} from 'rxjs';
import {selectCollectionPermissions} from '../../../../core/store/user-permissions/user-permissions.state';

@Component({
  selector: 'post-it-collection',
  templateUrl: './post-it-collection.component.html',
  styleUrls: ['./post-it-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostItCollectionComponent implements OnChanges {
  @Input()
  public collection: Collection;

  @Input()
  public workspace: Workspace;

  @Output()
  public update = new EventEmitter<Collection>();

  @Output()
  public create = new EventEmitter<Collection>();

  @Output()
  public delete = new EventEmitter();

  @Output()
  public favoriteToggle = new EventEmitter();

  @Output()
  public selected = new EventEmitter();

  @Output()
  public unselected = new EventEmitter();

  @ViewChild(IconColorPickerComponent)
  public iconColorDropdownComponent: IconColorPickerComponent;

  public permissions$: Observable<AllowedPermissions>;

  constructor(private router: Router, private store$: Store<AppState>) {}

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.collection) {
      this.permissions$ = this.store$.pipe(select(selectCollectionPermissions(this.collection?.id)));
    }
  }

  public onNameChanged(name: string) {
    if (name === '') {
      return;
    }
    const resourceModel = {...this.collection, name};
    if (this.collection.id) {
      this.update.emit(resourceModel);
    } else {
      this.create.emit(resourceModel);
    }
  }

  public onDelete() {
    this.delete.emit();
  }

  public toggleFavorite() {
    this.favoriteToggle.emit();
  }

  public workspacePath(): string {
    return `/w/${this.workspace.organizationCode}/${this.workspace.projectCode}`;
  }

  public queryForCollectionDocuments(): string {
    const query: Query = {stems: [{collectionId: this.collection.id}]};
    return convertQueryModelToString(query);
  }

  public togglePicker() {
    this.iconColorDropdownComponent.toggle();
  }

  public onIconColorChange(data: {icon: string; color: string}) {
    // we know that uncreated collection is not in store
    this.collection.icon = data.icon;
    this.collection.color = data.color;
  }

  public openCollection() {
    if (this.collection?.id) {
      this.router.navigate([this.workspacePath(), 'view', Perspective.Workflow], {
        queryParams: {q: this.queryForCollectionDocuments()},
      });
    }
  }
}
