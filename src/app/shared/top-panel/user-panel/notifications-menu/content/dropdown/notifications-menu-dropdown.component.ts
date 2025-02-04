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
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {UserNotification} from '../../../../../../core/model/user-notification';
import {Dictionary} from '@ngrx/entity';
import {Organization} from '../../../../../../core/store/organizations/organization';
import {DropdownPosition} from '../../../../../dropdown/dropdown-position';
import {DropdownComponent} from '../../../../../dropdown/dropdown.component';

@Component({
  selector: 'notifications-menu-dropdown',
  templateUrl: './notifications-menu-dropdown.component.html',
  styleUrls: ['./notifications-menu-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsMenuDropdownComponent implements OnDestroy {
  @Input()
  public unreadNotifications: UserNotification[];

  @Input()
  public allNotifications: UserNotification[];

  @Input()
  public unreadOnly: boolean;

  @Input()
  public organizations: Dictionary<Organization>;

  @Input()
  public origin: ElementRef | HTMLElement;

  @Output()
  public toggleUnread = new EventEmitter();

  @Output()
  public deleteNotification = new EventEmitter<UserNotification>();

  @Output()
  public readNotification = new EventEmitter<{notification: UserNotification; read: boolean}>();

  @Output()
  public clickNotification = new EventEmitter<UserNotification>();

  @ViewChild(DropdownComponent)
  public dropdown: DropdownComponent;

  public readonly dropdownPositions = [DropdownPosition.BottomEnd];

  public toggleUnreadFilter(event: MouseEvent) {
    event.stopPropagation();
    this.toggleUnread.emit();
  }

  public deleteNotificationEvent(notification: UserNotification) {
    this.deleteNotification.next(notification);
  }

  public setNotificationReadEvent($event: {notification: UserNotification; read: boolean}) {
    this.readNotification.next($event);
  }

  public navigateToTarget(notification: UserNotification) {
    this.clickNotification.next(notification);
    this.close();
  }

  public open() {
    this.dropdown?.open();
  }

  public close() {
    this.dropdown?.close();
  }

  public ngOnDestroy() {
    this.close();
  }
}
