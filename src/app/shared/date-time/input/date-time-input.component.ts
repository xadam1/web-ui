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
import {parseDateTimeByConstraint} from '../../utils/date.utils';
import {createDateTimeOptions, DateTimeOptions} from '../date-time-options';
import {DateTimePickerComponent} from '../picker/date-time-picker.component';
import {KeyCode} from '../../key-code';
import {DateTimeConstraint, resetUnusedMomentPart} from '@lumeer/data-filters';
import * as moment from 'moment';
import {isDateValid} from '../../utils/common.utils';

@Component({
  selector: 'date-time-input',
  templateUrl: './date-time-input.component.html',
  styleUrls: ['./date-time-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimeInputComponent implements OnChanges {
  @Input()
  public format: string;

  @Input()
  public id: string;

  @Input()
  public min: Date;

  @Input()
  public max: Date;

  @Input()
  public readonly: boolean;

  @Input()
  public value: Date;

  @Input()
  public placeholder: string;

  @Input()
  public asUtc: boolean;

  @Output()
  public valueChange = new EventEmitter<Date>();

  @ViewChild('dateTimeInput')
  public dateTimeInput: ElementRef<HTMLInputElement>;

  @ViewChild(DateTimePickerComponent)
  public dateTimePicker: DateTimePickerComponent;

  private shouldSaveOnBlur = false;
  private valueSnapshot: Date;

  public options: DateTimeOptions;

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.format && this.format) {
      this.options = createDateTimeOptions(this.format);
    }
  }

  public onFocus() {
    this.valueSnapshot = this.value;
    this.dateTimePicker.open();
  }

  public onClickOutside(event: Event) {
    this.close();
  }

  public close() {
    this.dateTimePicker?.close();
  }

  public onBlur() {
    if (this.dateTimeInput && this.shouldSaveOnBlur) {
      const value = parseDateTimeByConstraint(
        this.dateTimeInput.nativeElement.value,
        new DateTimeConstraint({format: this.format})
      );
      this.valueChange.emit(value);
    }

    this.shouldSaveOnBlur = false;
  }

  public onSave(date: Date) {
    const momentDate = isDateValid(date) ? (this.asUtc ? moment.utc(date) : moment(date)) : null;
    this.valueChange.emit(resetUnusedMomentPart(momentDate, this.format)?.toDate());
  }

  public onCancel() {
    this.valueChange.emit(this.valueSnapshot);
    this.valueSnapshot = null;
  }

  public onInput() {
    this.shouldSaveOnBlur = true;
  }

  public onKeyDown(event: KeyboardEvent) {
    if (event.code === KeyCode.Enter) {
      event.stopPropagation();
      event.preventDefault();
      this.dateTimeInput.nativeElement.blur();
      this.close();
    } else if (event.code === KeyCode.Tab) {
      this.dateTimeInput.nativeElement.blur();
      this.close();
    }
  }
}
