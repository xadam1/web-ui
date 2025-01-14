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

import {DefaultWorkspaceDto} from './default-workspace.dto';
import {TeamDto} from './team.dto';

export interface UserDto {
  id?: string;
  name?: string;
  email: string;
  organizations?: string[];
  groups?: TeamDto[];
  defaultWorkspace?: DefaultWorkspaceDto;
  agreement?: boolean;
  agreementDate?: number;
  newsletter?: boolean;
  wizardDismissed?: boolean;
  lastLoggedIn?: number;
  referral?: string;
  language?: string;
  affiliatePartner?: boolean;
  emailVerified?: boolean;
  notifications?: NotificationsSettingsDto;
  hints?: UserHintsDto;
  onboarding?: UserOnboardingDto;
}

export interface UserOnboardingDto {
  template?: string;
  invitedUsers?: number;
  videoShowed?: boolean;
  helpOpened?: boolean;
  videoPlayed?: boolean;
  videoPlayedSeconds?: number;
}

export type UserHintsDto = {[key: string]: any};

export interface NotificationsSettingsDto {
  settings?: NotificationSettingsDto[];
  language?: string;
}

export interface NotificationSettingsDto {
  notificationType?: string;
  notificationChannel?: string;
  notificationFrequency?: string;
}
