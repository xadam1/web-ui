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
import {DropdownOption} from '../options/dropdown-option';

@Pipe({
  name: 'groupDropdownOptions',
})
export class GroupDropdownOptionsPipe implements PipeTransform {
  public transform(options: DropdownOption[]): {group: string; options: DropdownOption[]}[] {
    return (options || []).reduce((groups, option) => {
      const groupName = option.group || '';
      let group = groups.find(group => group.group === groupName);
      if (!group) {
        group = {group: groupName, options: []};
        groups.push(group);
      }
      group.options.push(option);

      return groups;
    }, []);
  }
}
