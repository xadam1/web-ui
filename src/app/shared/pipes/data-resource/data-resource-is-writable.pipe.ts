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
import {AttributesResource, DataResource} from '../../../core/model/resource';
import {AllowedPermissions} from '../../../core/model/allowed-permissions';
import {User} from '../../../core/store/users/user';
import {dataResourcePermissions} from '../../utils/permission.utils';
import {ConstraintData} from '@lumeer/data-filters';

@Pipe({
  name: 'dataResourceIsWritable',
})
export class DataResourceIsWritablePipe implements PipeTransform {
  public transform(
    dataResource: DataResource,
    resource: AttributesResource,
    permissions: AllowedPermissions,
    user: User,
    constraintData: ConstraintData
  ): boolean {
    const dataPermissions = dataResourcePermissions(dataResource, resource, permissions, user, constraintData);
    return dataResource?.id ? dataPermissions?.edit : dataPermissions?.create;
  }
}
