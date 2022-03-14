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

import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {PopoverDirective} from 'ngx-bootstrap/popover';

@Component({
  selector: 'red-dot',
  templateUrl: './red-dot.component.html',
  styleUrls: ['./red-dot.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedDotComponent {
  @Input()
  public title: string;

  @Input()
  public footer: string;

  @Output()
  private dismissed = new EventEmitter();

  public onDismissClick(pop: PopoverDirective, event: Event) {
    pop.hide();
    event.stopPropagation();
    this.dismissed.emit();
  }
}
