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
import {ShareViewModalComponent} from './share/share-view-modal.component';
import {ShareViewInputComponent} from './share/body/input/share-view-input.component';
import {ShareViewCopyComponent} from './share/body/copy/share-view-copy.component';
import {ShareViewDialogBodyComponent} from './share/body/share-view-dialog-body.component';
import {ViewGroupPermissionsPipe} from './share/pipes/view-group-permissions.pipe';
import {ViewUserPermissionsPipe} from './share/pipes/view-user-permissions.pipe';
import {CanAddNewUserPipe} from './share/pipes/can-add-new-user.pipe';
import {ViewSettingsModalComponent} from './settings/view-settings-modal.component';
import {PipesModule} from '../../pipes/pipes.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ModalWrapperModule} from '../wrapper/modal-wrapper.module';
import {InputModule} from '../../input/input.module';
import {GravatarModule} from 'ngx-gravatar';
import {DropdownModule} from '../../dropdown/dropdown.module';
import {DataInputModule} from '../../data-input/data-input.module';
import {ViewHeaderComponent} from './header/view-header.component';
import {ViewSettingsModalBodyComponent} from './settings/body/view-settings-modal-body.component';
import {ViewsUniqueFoldersPipe} from './settings/pipes/views-unique-folders.pipe';
import {PickerModule} from '../../picker/picker.module';
import {DirectivesModule} from '../../directives/directives.module';
import {ViewUsersComponent} from './share/body/users/view-users.component';
import {ViewTeamsComponent} from './share/body/teams/view-teams.component';
import {UsersModule} from '../../users/users.module';
import {TeamsModule} from '../../teams/teams.module';
import {BoxModule} from '../../box/box.module';

@NgModule({
  declarations: [
    ShareViewModalComponent,
    ShareViewInputComponent,
    ShareViewCopyComponent,
    ShareViewDialogBodyComponent,
    ViewGroupPermissionsPipe,
    ViewUserPermissionsPipe,
    CanAddNewUserPipe,
    ViewHeaderComponent,
    ViewSettingsModalComponent,
    ViewSettingsModalBodyComponent,
    ViewsUniqueFoldersPipe,
    ViewUsersComponent,
    ViewTeamsComponent,
  ],
  imports: [
    CommonModule,
    PipesModule,
    FormsModule,
    ReactiveFormsModule,
    ModalWrapperModule,
    InputModule,
    GravatarModule,
    DropdownModule,
    DataInputModule,
    DirectivesModule,
    PickerModule,
    UsersModule,
    TeamsModule,
    BoxModule,
  ],
  exports: [ShareViewModalComponent, ViewSettingsModalComponent],
})
export class ViewModalModule {}
