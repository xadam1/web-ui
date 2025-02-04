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
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormAttributeCellConfig,
  FormCell,
  FormCellType,
  FormLinkCellConfig,
} from '../../../../../../../core/store/form/form-model';
import {Attribute, Collection} from '../../../../../../../core/store/collections/collection';
import {
  AttributeLockFiltersStats,
  ConstraintData,
  ConstraintType,
  DataValue,
  UnknownConstraint,
} from '@lumeer/data-filters';
import {findAttribute} from '../../../../../../../core/store/collections/collection.util';
import {Observable, of} from 'rxjs';
import {DataInputConfiguration} from '../../../../../../../shared/data-input/data-input-configuration';
import {DataCursor} from '../../../../../../../shared/data-input/data-cursor';
import {FormError} from '../../validation/form-validation';
import {FormLinkData, FormLinkSelectedData} from '../../model/form-link-data';
import {AppState} from '../../../../../../../core/store/app.state';
import {select, Store} from '@ngrx/store';
import {DocumentModel} from '../../../../../../../core/store/documents/document.model';
import {selectDocumentsByCollectionAndQuery} from '../../../../../../../core/store/common/permissions.selectors';
import {selectConstraintData} from '../../../../../../../core/store/constraint-data/constraint-data.state';
import {mergeAttributeOverride} from '../../../../../../../shared/utils/attribute.utils';
import {DataInputSaveAction} from '../../../../../../../shared/data-input/data-input-save-action';

@Component({
  selector: 'form-view-cell',
  templateUrl: './form-view-cell.component.html',
  styleUrls: ['./form-view-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormViewCellComponent implements OnInit, OnChanges {
  @Input()
  public cell: FormCell;

  @Input()
  public collection: Collection;

  @Input()
  public dataValues: Record<string, DataValue>;

  @Input()
  public linkValues: Record<string, FormLinkData>;

  @Input()
  public documentId: string;

  @Input()
  public editable: boolean;

  @Input()
  public editing: boolean;

  @Input()
  public lockStats: AttributeLockFiltersStats;

  @Input()
  public formErrors: FormError[];

  @Input()
  public constraintData: ConstraintData;

  @Output()
  public attributeValueChange = new EventEmitter<{
    attributeId: string;
    dataValue: DataValue;
    action?: DataInputSaveAction;
  }>();

  @Output()
  public linkValueChange = new EventEmitter<{
    linkTypeId: string;
    selectedData: FormLinkSelectedData;
    action?: DataInputSaveAction;
  }>();

  @Output()
  public editStart = new EventEmitter();

  @Output()
  public editCancel = new EventEmitter();

  public readonly type = FormCellType;
  public readonly dataInputConfiguration: DataInputConfiguration = {
    common: {allowRichText: true, skipValidation: true},
    files: {saveInMemory: true},
    select: {wrapItems: true},
  };

  public attribute: Attribute;
  public dataValue: DataValue;
  public cursor: DataCursor;
  public linkData: FormLinkData;
  public linkMulti: boolean;
  public linkAttributeId: string;
  public mandatory: boolean;
  public showBorder: boolean;

  public dataIsValid: boolean;

  public linkDocuments$: Observable<DocumentModel[]>;
  public constraintData$: Observable<ConstraintData>;

  constructor(private store$: Store<AppState>) {}

  public ngOnInit() {
    this.constraintData$ = this.store$.pipe(select(selectConstraintData));
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (
      changes.cell ||
      changes.dataValues ||
      changes.collection ||
      changes.documentId ||
      changes.linkValues ||
      changes.collectionLinkTypes
    ) {
      this.initDataVariables();
    }
  }

  private initDataVariables() {
    switch (this.cell?.type) {
      case FormCellType.Attribute:
        this.initAttributeDataVariables();
        break;
      case FormCellType.Link:
        this.initLinkDataVariables();
        break;
    }
  }

  private initAttributeDataVariables() {
    const config = <FormAttributeCellConfig>this.cell?.config;

    this.attribute = mergeAttributeOverride(
      findAttribute(this.collection?.attributes, config?.attributeId),
      config?.attribute
    );
    if (this.attribute) {
      this.attribute = {...this.attribute, constraint: this.attribute.constraint || new UnknownConstraint()};
    }
    this.dataValue = this.dataValues?.[this.attribute?.id];
    this.checkCursor();
    this.showBorder = !(this.attribute?.constraint?.type === ConstraintType.Boolean);

    this.dataIsValid = !!this.attribute;
    this.mandatory = this.attribute?.mandatory;
  }

  private checkCursor() {
    if (
      !this.cursor ||
      this.cursor.attributeId !== this.attribute?.id ||
      this.cursor?.collectionId !== this.collection?.id ||
      this.cursor?.documentId !== this.documentId
    ) {
      this.cursor = {attributeId: this.attribute?.id, collectionId: this.collection?.id, documentId: this.documentId};
    }
  }

  private initLinkDataVariables() {
    const config = <FormLinkCellConfig>this.cell?.config;

    this.linkMulti = !config.maxLinks || config.maxLinks > 1;
    this.linkAttributeId = config.attributeId;
    this.linkData = this.linkValues?.[config?.linkTypeId];
    if (this.linkData?.collection) {
      const query = {stems: [{collectionId: this.linkData.collection.id, filters: config.filters}]};
      this.linkDocuments$ = this.store$.pipe(
        select(selectDocumentsByCollectionAndQuery(this.linkData.collection.id, query, this.linkData.view))
      );
    } else {
      this.linkDocuments$ = of([]);
    }
    this.showBorder = true;
    this.dataIsValid = !!this.linkData?.linkType;
    this.mandatory = config?.minLinks > 0;
  }

  public onElementClick(event: MouseEvent) {
    if (this.editable) {
      this.editStart.emit();
    }
  }

  public onValueSave(dataValue: DataValue, action?: DataInputSaveAction) {
    if (this.attribute) {
      this.attributeValueChange.emit({attributeId: this.attribute.id, dataValue, action});
    }
  }

  public onCancelEditing() {
    this.editCancel.emit();
  }

  public onSelectedDocumentIdsChange(selectedData: FormLinkSelectedData, action?: DataInputSaveAction) {
    if (this.linkData?.linkType) {
      this.linkValueChange.emit({linkTypeId: this.linkData.linkType.id, selectedData, action});
    }
  }
}
