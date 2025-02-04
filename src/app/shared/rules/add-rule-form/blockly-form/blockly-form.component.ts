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

import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {BlocklyRuleConfiguration} from '../../../../core/model/rule';
import {Observable} from 'rxjs';
import {Collection} from '../../../../core/store/collections/collection';
import {select, Store} from '@ngrx/store';
import {AppState} from '../../../../core/store/app.state';
import {LinkType} from '../../../../core/store/link-types/link.type';
import {BLOCKLY_FUNCTION_TOOLBOX} from '../../../blockly/blockly-editor/blockly-editor-toolbox';
import {BlocklyDebugDisplay} from '../../../blockly/blockly-debugger/blockly-debugger.component';
import {BLOCKLY_FUNCTION_BUTTONS} from '../../../blockly/blockly-editor/blockly-utils';
import {
  selectContributeAndWritableCollections,
  selectContributeAndWritableLinkTypes,
  selectViewsByRead,
} from '../../../../core/store/common/permissions.selectors';
import {View} from '../../../../core/store/views/view';
import {selectResourceVariablesKeysByCurrentProject} from '../../../../core/store/resource-variables/resource-variables.state';
import {RuleVariable} from '../../../blockly/rule-variable-type';

@Component({
  selector: 'blockly-form',
  templateUrl: './blockly-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlocklyFormComponent implements OnInit {
  @Input()
  public config: BlocklyRuleConfiguration;

  @Input()
  public collection: Collection;

  @Input()
  public linkType: LinkType;

  @Input()
  public form: FormGroup;

  public collections$: Observable<Collection[]>;
  public linkTypes$: Observable<LinkType[]>;
  public views$: Observable<View[]>;
  public variableNames$: Observable<string[]>;

  public variables: RuleVariable[];
  public displayDebug: BlocklyDebugDisplay = BlocklyDebugDisplay.DisplayNone;

  public readonly functionToolbox = BLOCKLY_FUNCTION_TOOLBOX;
  public readonly debugButtons = BLOCKLY_FUNCTION_BUTTONS;

  public constructor(private store$: Store<AppState>) {}

  public get blocklyXml(): string {
    return this.form.get('blocklyXml').value;
  }

  public get blocklyJs(): string {
    return this.form.get('blocklyJs').value;
  }

  public get blocklyDryRunResult(): string {
    return this.form.get('blocklyDryRunResult').value;
  }

  public get blocklyError(): string {
    return this.form.get('blocklyError').value;
  }

  public get blocklyResultTimestamp(): number {
    return this.form.get('blocklyResultTimestamp').value;
  }

  public get blocklyRecursive(): string {
    return this.form.get('blocklyRecursive').value;
  }

  public display(type: BlocklyDebugDisplay) {
    if (type !== BlocklyDebugDisplay.DisplayNone && this.displayDebug === type) {
      this.display(BlocklyDebugDisplay.DisplayNone);
    } else {
      this.displayDebug = type;
    }
  }

  public ngOnInit() {
    this.collections$ = this.store$.pipe(select(selectContributeAndWritableCollections));
    this.views$ = this.store$.pipe(select(selectViewsByRead));
    this.linkTypes$ = this.store$.pipe(select(selectContributeAndWritableLinkTypes));
    this.variableNames$ = this.store$.pipe(select(selectResourceVariablesKeysByCurrentProject));

    if (this.collection) {
      this.variables = [
        {name: 'oldRecord', collectionId: this.collection.id},
        {name: 'newRecord', collectionId: this.collection.id},
      ];
    }
    if (this.linkType) {
      this.variables = [
        {name: 'oldLink', linkTypeId: this.linkType.id},
        {name: 'newLink', linkTypeId: this.linkType.id},
      ];
    }
  }

  public onJsUpdate(jsCode: string) {
    this.form.get('blocklyJs').setValue(jsCode);
  }

  public onXmlUpdate(xmlCode: string) {
    this.form.get('blocklyXml').setValue(xmlCode);
  }
}
