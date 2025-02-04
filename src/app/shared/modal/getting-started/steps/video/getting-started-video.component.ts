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

import {Component, ChangeDetectionStrategy, OnInit, ElementRef, OnDestroy} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {GettingStartedService} from '../../getting-started.service';
import {ConfigurationService} from '../../../../../configuration/configuration.service';

import Player, {TimeEvent} from '@vimeo/player';
import {generateId} from '../../../../utils/resource.utils';
import {LanguageCode} from '../../../../../core/model/language';

@Component({
  selector: 'getting-started-video',
  templateUrl: './getting-started-video.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./getting-started-video.component.scss'],
  host: {class: 'd-block'},
})
export class GettingStartedVideoComponent implements OnInit, OnDestroy {
  public readonly elementId = `videoPlaceholder${generateId()}`;

  public videoId: number;

  private player: Player;
  private playedSecondsArray: boolean[];

  constructor(
    private element: ElementRef,
    private sanitizer: DomSanitizer,
    private service: GettingStartedService,
    private configurationService: ConfigurationService
  ) {}

  public get locale(): string {
    return this.configurationService.getConfiguration().locale;
  }

  public ngOnInit() {
    this.videoId = this.makeVideoId();

    const element = this.element.nativeElement.getElementsByClassName('video-placeholder')[0];
    this.player = new Player(element, {
      id: this.videoId,
      quality: '1080p',
      responsive: true,
    });

    this.player.on('play', () => this.onVideoPlayed());
    this.player.on('timeupdate', value => this.onVideoPlaying(value));
  }

  private onVideoPlaying(event: TimeEvent) {
    this.initPlayedSecondsArray(event);

    this.playedSecondsArray[Math.floor(event.seconds)] = true;
  }

  private initPlayedSecondsArray(event: TimeEvent) {
    if (this.playedSecondsArray) {
      return;
    }

    this.playedSecondsArray = [];

    for (let second = 0; second < event.duration; second++) {
      this.playedSecondsArray[second] = false;
    }
  }

  private onVideoPlayed() {
    this.service.onVideoPlayed();
  }

  private makeVideoId(): number {
    switch (this.service.selectedTemplate?.code) {
      default:
        return this.getDefaultVideoId();
    }
  }

  private getDefaultVideoId(): number {
    switch (this.locale) {
      case LanguageCode.CZ:
        return 683864380;
      default:
        return 676885140;
    }
  }

  public ngOnDestroy() {
    this.player.destroy();
    this.computeTotalSecondsPlayed();
  }

  private computeTotalSecondsPlayed() {
    if (!this.playedSecondsArray) {
      return;
    }

    const playedSeconds = this.playedSecondsArray.filter(played => played).length;
    this.service.onVideoPlayedSeconds(playedSeconds);
  }
}
