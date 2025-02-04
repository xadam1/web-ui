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

import {Component, ChangeDetectionStrategy, Input, Output, EventEmitter} from '@angular/core';
import {Collection} from '../../../../core/store/collections/collection';
import {GanttChartStemConfig, GanttChartConfig} from '../../../../core/store/gantt-charts/gantt-chart';
import {LinkType} from '../../../../core/store/link-types/link.type';
import {Query, QueryStem} from '../../../../core/store/navigation/query/query';
import {deepObjectCopy} from '../../../../shared/utils/common.utils';
import {createDefaultGanttChartStemConfig} from '../util/gantt-chart-util';

@Component({
  selector: 'gantt-chart-config',
  templateUrl: './gantt-chart-config.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttChartConfigComponent {
  @Input()
  public collections: Collection[];

  @Input()
  public linkTypes: LinkType[];

  @Input()
  public query: Query;

  @Input()
  public config: GanttChartConfig;

  @Output()
  public configChange = new EventEmitter<GanttChartConfig>();

  public readonly defaultStemConfig = createDefaultGanttChartStemConfig();

  public onStemConfigChange(stemConfig: GanttChartStemConfig, stem: QueryStem, index: number) {
    const config = deepObjectCopy<GanttChartConfig>(this.config);
    config.stemsConfigs[index] = {...stemConfig, stem};
    this.configChange.emit(config);
  }

  public trackByStem(index: number, stem: QueryStem): string {
    return stem.collectionId + index;
  }

  public onCategoryRemoved(index: number, stemIndex: number) {
    const config = deepObjectCopy<GanttChartConfig>(this.config);
    config.stemsConfigs[stemIndex].categories.splice(index, 1);
    this.onSwimlaneItemRemoved(config, index, stemIndex);
  }

  public onAttributeRemoved(index: number, stemIndex: number) {
    const config = deepObjectCopy<GanttChartConfig>(this.config);
    config.stemsConfigs[stemIndex].attributes.splice(index, 1);
    this.onSwimlaneItemRemoved(config, index, stemIndex);
  }

  public onSwimlaneItemRemoved(config: GanttChartConfig, index: number, stemIndex: number) {
    const maxCategories = config.stemsConfigs.reduce(
      (max, stemConfig) => Math.max(max, (stemConfig.categories || []).length),
      0
    );
    if ((config.swimlaneWidths || []).length > maxCategories) {
      config.swimlaneWidths.splice(index, 1);
    }
    this.configChange.emit(config);
  }
}
