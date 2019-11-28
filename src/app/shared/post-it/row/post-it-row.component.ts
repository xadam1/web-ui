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
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  ViewChild,
  ElementRef,
  Renderer2,
  OnChanges,
  AfterViewInit,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import {DataRowComponent} from '../../data/data-row-component';
import {Attribute} from '../../../core/store/collections/collection';
import {DataRow} from '../../data/data-row.service';
import {DataCursor} from '../../data-input/data-cursor';
import {AllowedPermissions} from '../../../core/model/allowed-permissions';
import {ConstraintData, ConstraintType} from '../../../core/model/data/constraint';
import {BehaviorSubject} from 'rxjs';
import {I18n} from '@ngx-translate/i18n-polyfill';
import {isNotNullOrUndefined} from '../../utils/common.utils';
import {DataValue, DataValueInputType} from '../../../core/model/data-value';
import {UnknownDataValue} from '../../../core/model/data-value/unknown.data-value';
import {UnknownConstraint} from '../../../core/model/constraint/unknown.constraint';
import {BooleanConstraint} from '../../../core/model/constraint/boolean.constraint';

@Component({
  selector: 'post-it-row',
  templateUrl: './post-it-row.component.html',
  styleUrls: ['./post-it-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostItRowComponent implements DataRowComponent, OnChanges, AfterViewInit {
  @Input()
  public row: DataRow;

  @Input()
  public cursor: DataCursor;

  @Input()
  public permissions: AllowedPermissions;

  @Input()
  public constraintData: ConstraintData;

  @Input()
  public readonly: boolean;

  @Input()
  public unusedAttributes: Attribute[];

  @Output()
  public newValue = new EventEmitter<any>();

  @Output()
  public newKey = new EventEmitter<string>();

  @Output()
  public deleteRow = new EventEmitter();

  @Output()
  public onFocus = new EventEmitter<number>();

  @Output()
  public onEdit = new EventEmitter<number>();

  @Output()
  public resetFocusAndEdit = new EventEmitter<number>();

  @ViewChild('wrapperElement', {static: false, read: ElementRef})
  public wrapperElement: ElementRef;

  @ViewChild('iconsElement', {static: false, read: ElementRef})
  public iconsElement: ElementRef;

  @HostBinding('class.key-focused')
  public keyFocused: boolean;

  @HostBinding('class.value-focused')
  public valueFocused: boolean;

  public readonly booleanConstraintType = ConstraintType.Boolean;

  public placeholder: string;

  public keyEditing$ = new BehaviorSubject(false);
  public keyDataValue: DataValue;

  public editedValue: DataValue;
  public editing$ = new BehaviorSubject(false);
  public dataValue: DataValue;

  public get constraintType(): ConstraintType {
    return this.row && this.row.attribute && this.row.attribute.constraint && this.row.attribute.constraint.type;
  }

  constructor(private i18n: I18n, private renderer: Renderer2) {
    this.placeholder = i18n({id: 'dataResource.attribute.placeholder.short', value: 'Enter name'});
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.row && this.row) {
      this.keyDataValue = this.createKeyDataValue();
      this.dataValue = this.createDataValue();
    }
  }

  private createKeyDataValue(value?: any, inputType?: DataValueInputType): DataValue {
    const initialValue = isNotNullOrUndefined(value)
      ? value
      : (this.row.attribute && this.row.attribute.name) || this.row.key;
    const initialInputType = isNotNullOrUndefined(value) ? inputType : DataValueInputType.Stored;
    return new UnknownDataValue(initialValue, initialInputType);
  }

  private createDataValue(value?: any, inputType?: DataValueInputType): DataValue {
    const constraint = (this.row.attribute && this.row.attribute.constraint) || new UnknownConstraint();
    const initialValue = isNotNullOrUndefined(value) ? value : this.row.value;
    const initialInputType = isNotNullOrUndefined(value) ? inputType : DataValueInputType.Stored;
    return constraint.createDataValue(initialValue, initialInputType, this.constraintData);
  }

  public onNewKey(dataValue: DataValue) {
    const value = dataValue.serialize();
    if (value !== this.getCurrentKey()) {
      this.newKey.emit(value);
    }
    this.onKeyInputCancel();
  }

  private getCurrentKey(): any {
    return (this.row.attribute && this.row.attribute.name) || this.row.key;
  }

  public onNewValue(dataValue: DataValue) {
    this.editedValue = null;
    const value = dataValue.serialize();
    if (value !== this.getCurrentValue()) {
      this.newValue.emit(value);
    }
    this.onDataInputCancel();
  }

  private getCurrentValue(): any {
    return this.row.value;
  }

  public onValueFocus() {
    if (!this.editing$.value) {
      this.onFocus.emit(1);
    }
  }

  public onKeyFocus() {
    if (!this.keyEditing$.value) {
      this.onFocus.emit(0);
    }
  }

  public onDataInputCancel() {
    this.resetFocusAndEdit.emit(1);
  }

  public onKeyInputCancel() {
    this.resetFocusAndEdit.emit(0);
  }

  public onDataInputDblClick(event: MouseEvent) {
    if (!this.editing$.value) {
      event.preventDefault();
      this.onEdit.emit(1);
    }
  }

  public startColumnEditing(column: number, value?: any): boolean {
    if (column === 0) {
      this.endValueEditing();
      return this.startKeyEditing(value);
    } else if (column === 1) {
      this.endKeyEditing();
      return this.startValueEditing(value);
    }
    return false;
  }

  private startKeyEditing(value?: any): boolean {
    if (this.isManageable() && !this.keyEditing$.value) {
      this.keyDataValue = this.createKeyDataValue(value, DataValueInputType.Typed);
      this.keyEditing$.next(true);
      return true;
    }
    return false;
  }

  private startValueEditing(value?: any): boolean {
    this.editedValue = null;
    if (this.isEditable() && !this.editing$.value) {
      if (this.shouldDirectEditValue()) {
        this.onNewValue(this.computeDirectEditValue());
      } else {
        this.dataValue = this.createDataValue(value, DataValueInputType.Typed);
        this.editing$.next(true);
        return true;
      }
    }
    return false;
  }

  private shouldDirectEditValue(): boolean {
    return this.constraintType === ConstraintType.Boolean;
  }

  private computeDirectEditValue(): DataValue {
    if (this.constraintType === ConstraintType.Boolean) {
      const constraint = this.row.attribute.constraint as BooleanConstraint;
      return constraint.createDataValue(!this.row.value);
    }

    return null;
  }

  private isEditable(): boolean {
    return this.permissions && this.permissions.writeWithView && !this.readonly;
  }

  public onKeyInputDblClick(event: MouseEvent) {
    if (!this.keyEditing$.value) {
      event.preventDefault();
      this.onEdit.emit(0);
    }
  }

  public endColumnEditing(column: number) {
    if (column === 0) {
      this.endKeyEditing();
    } else if (column === 1) {
      this.endValueEditing();
    }
  }

  private endValueEditing() {
    this.keyDataValue = this.createKeyDataValue();
    if (this.editing$.value) {
      if (this.editedValue) {
        this.onNewValue(this.editedValue);
      }
      this.editing$.next(false);
    }
  }

  private endKeyEditing() {
    this.dataValue = this.createDataValue();
    if (this.keyEditing$.value) {
      this.keyEditing$.next(false);
    }
  }

  private isManageable(): boolean {
    return this.permissions && this.permissions.manageWithView;
  }

  public focusColumn(column: number) {
    if (column === 0) {
      this.focusKey();
      this.valueFocused = false;
    } else if (column === 1) {
      this.focusValue();
      this.keyFocused = false;
    }
  }

  private focusKey() {
    if (this.keyEditing$.value) {
      return;
    }
    this.keyFocused = true;
  }

  private focusValue() {
    if (this.editing$.value) {
      return;
    }
    this.valueFocused = true;
  }

  public endRowEditing() {
    this.endKeyEditing();
    this.endValueEditing();
  }

  public unFocusRow() {
    this.keyFocused = false;
    this.valueFocused = false;
  }

  public onValueEdit(value: DataValue) {
    this.editedValue = value;
  }

  @HostListener('window:resize')
  public onWindowResize() {
    this.computeWidth();
  }

  public ngAfterViewInit() {
    this.computeWidth();
  }

  private computeWidth() {
    const iconsWidth = (this.iconsElement && this.iconsElement.nativeElement.clientWidth) || 0;
    if (this.wrapperElement) {
      this.renderer.setStyle(this.wrapperElement.nativeElement, 'width', `calc(100% - ${iconsWidth}px - 0.25rem)`);
    }
  }
}