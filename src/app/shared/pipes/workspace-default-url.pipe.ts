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

import {Pipe, PipeTransform} from '@angular/core';
import {Workspace} from '../../core/store/navigation/workspace';
import {Perspective} from '../../view/perspectives/perspective';
import {User} from '../../core/store/users/user';

@Pipe({
  name: 'workspaceDefaultUrl',
})
export class WorkspaceDefaultUrlPipe implements PipeTransform {
  public transform(workspace: Workspace, user: User): any[] {
    if (workspace?.organizationCode && workspace?.projectCode) {
      return ['/', 'w', workspace.organizationCode, workspace.projectCode, 'view', Perspective.Search];
    } else if (user?.defaultWorkspace?.organizationCode && user?.defaultWorkspace?.projectCode) {
      return [
        '/',
        'w',
        user.defaultWorkspace.organizationCode,
        user.defaultWorkspace.projectCode,
        'view',
        Perspective.Search,
      ];
    }
    return ['/'];
  }
}
