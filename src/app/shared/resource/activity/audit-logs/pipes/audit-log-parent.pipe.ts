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
import {AuditLog} from '../../../../../core/store/audit-logs/audit-log.model';
import {AttributesResource} from '../../../../../core/model/resource';
import {ResourceType} from '../../../../../core/model/resource-type';
import {Collection} from '../../../../../core/store/collections/collection';
import {LinkType} from '../../../../../core/store/link-types/link.type';

@Pipe({
  name: 'auditLogParent',
})
export class AuditLogParentPipe implements PipeTransform {
  public transform(
    auditLog: AuditLog,
    collectionsMap: Record<string, Collection>,
    linkTypesMap: Record<string, LinkType>
  ): AttributesResource {
    if (auditLog.resourceType === ResourceType.Document) {
      return collectionsMap?.[auditLog.parentId];
    }
    if (auditLog.resourceType === ResourceType.Link) {
      return linkTypesMap?.[auditLog.parentId];
    }
    return null;
  }
}
