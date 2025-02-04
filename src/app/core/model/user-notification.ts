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

import {Perspective} from '../../view/perspectives/perspective';

export enum UserNotificationType {
  OrganizationShared = 'ORGANIZATION_SHARED',
  ProjectShared = 'PROJECT_SHARED',
  CollectionShared = 'COLLECTION_SHARED',
  ViewShared = 'VIEW_SHARED',
  TaskAssigned = 'TASK_ASSIGNED',
  DueDateSoon = 'DUE_DATE_SOON',
  PastDueDate = 'PAST_DUE_DATE',
  StateUpdate = 'STATE_UPDATE',
  TaskUpdated = 'TASK_UPDATED',
  TaskChanged = 'TASK_CHANGED',
  TaskRemoved = 'TASK_REMOVED',
  TaskUnassigned = 'TASK_UNASSIGNED',
  TaskReopened = 'TASK_REOPENED',
  BulkAction = 'BULK_ACTION',
  DueDateChanged = 'DUE_DATE_CHANGED',
  TaskCommented = 'TASK_COMMENTED',
  TaskMentioned = 'TASK_MENTIONED',
}

export const UserNotificationTypeMap = {
  [UserNotificationType.OrganizationShared]: UserNotificationType.OrganizationShared,
  [UserNotificationType.ProjectShared]: UserNotificationType.ProjectShared,
  [UserNotificationType.CollectionShared]: UserNotificationType.CollectionShared,
  [UserNotificationType.ViewShared]: UserNotificationType.ViewShared,
  [UserNotificationType.TaskAssigned]: UserNotificationType.TaskAssigned,
  [UserNotificationType.DueDateSoon]: UserNotificationType.DueDateSoon,
  [UserNotificationType.PastDueDate]: UserNotificationType.PastDueDate,
  [UserNotificationType.StateUpdate]: UserNotificationType.StateUpdate,
  [UserNotificationType.TaskUpdated]: UserNotificationType.TaskUpdated,
  [UserNotificationType.TaskChanged]: UserNotificationType.TaskChanged,
  [UserNotificationType.TaskRemoved]: UserNotificationType.TaskRemoved,
  [UserNotificationType.TaskUnassigned]: UserNotificationType.TaskUnassigned,
  [UserNotificationType.TaskReopened]: UserNotificationType.TaskReopened,
  [UserNotificationType.BulkAction]: UserNotificationType.BulkAction,
  [UserNotificationType.DueDateChanged]: UserNotificationType.DueDateChanged,
  [UserNotificationType.TaskCommented]: UserNotificationType.TaskCommented,
  [UserNotificationType.TaskMentioned]: UserNotificationType.TaskMentioned,
};

export enum UserNotificationGroupType {
  ResourceShared = 'ResourceShared',
  TaskAssigned = 'TaskAssigned',
  TaskUpdated = 'TaskUpdated',
  TaskRemoved = 'TaskRemoved',
  DueDateChanged = 'DueDateChanged',
  StateUpdated = 'StateUpdated',
  Comments = 'Comments',
}

export const userNotificationGroupTypes: Record<UserNotificationGroupType, UserNotificationType[]> = {
  [UserNotificationGroupType.ResourceShared]: [
    UserNotificationType.OrganizationShared,
    UserNotificationType.ProjectShared,
    UserNotificationType.CollectionShared,
    UserNotificationType.ViewShared,
  ],
  [UserNotificationGroupType.TaskAssigned]: [
    UserNotificationType.TaskAssigned,
    UserNotificationType.TaskUnassigned,
    UserNotificationType.TaskReopened,
  ],
  [UserNotificationGroupType.DueDateChanged]: [
    UserNotificationType.DueDateSoon,
    UserNotificationType.PastDueDate,
    UserNotificationType.DueDateChanged,
  ],
  [UserNotificationGroupType.TaskUpdated]: [UserNotificationType.TaskUpdated],
  [UserNotificationGroupType.TaskRemoved]: [UserNotificationType.TaskRemoved],
  [UserNotificationGroupType.StateUpdated]: [UserNotificationType.StateUpdate],
  [UserNotificationGroupType.Comments]: [UserNotificationType.TaskCommented, UserNotificationType.TaskMentioned],
};

interface BasicUserNotification {
  id?: string;
  userId: string;
  createdAt?: Date;
  read: boolean;
  firstReadAt?: Date;
  deleting?: boolean;
}

export interface OrganizationUserNotification extends BasicUserNotification {
  organizationId: string;
}

export interface ProjectUserNotification extends OrganizationUserNotification {
  projectId: string;
  projectIcon: string;
  projectColor: string;
  projectCode: string;
  projectName: string;
}

export interface CollectionUserNotification extends ProjectUserNotification {
  collectionId: string;
  collectionIcon: string;
  collectionColor: string;
  collectionName: string;
}

export interface ViewUserNotification extends ProjectUserNotification {
  viewCode: string;
  viewName: string;
  viewPerspective: Perspective;
}

export interface DocumentUserNotification extends CollectionUserNotification {
  documentId: string;
}

export interface TaskUserNotification extends DocumentUserNotification {
  taskName?: string;
  taskNameAttribute?: string;
  taskDueDate?: string;
  taskState?: string;
  taskCompleted?: string;
  assignee?: string;
  collectionQuery?: string;
  documentCursor?: string;
}

export interface CommentUserNotification extends TaskUserNotification {
  comment?: string;
}

export interface CommentedUserNotification extends CommentUserNotification {
  type: UserNotificationType.TaskCommented;
}

export interface MentionedUserNotification extends CommentUserNotification {
  type: UserNotificationType.TaskMentioned;
}

export interface OrganizationSharedUserNotification extends OrganizationUserNotification {
  type: UserNotificationType.OrganizationShared;
}

export interface ProjectSharedUserNotification extends ProjectUserNotification {
  type: UserNotificationType.ProjectShared;
}

export interface CollectionSharedUserNotification extends CollectionUserNotification {
  type: UserNotificationType.CollectionShared;
}

export interface ViewSharedUserNotification extends ViewUserNotification {
  type: UserNotificationType.ViewShared;
}

export interface TaskAssignedUserNotification extends TaskUserNotification {
  type: UserNotificationType.TaskAssigned;
}

export interface TaskReopenedUserNotification extends TaskUserNotification {
  type: UserNotificationType.TaskReopened;
}

export interface TaskChangedUserNotification extends TaskUserNotification {
  type: UserNotificationType.TaskChanged;
}

export interface DueDateSoonUserNotification extends TaskUserNotification {
  type: UserNotificationType.DueDateSoon;
}

export interface PastDueDateUserNotification extends TaskUserNotification {
  type: UserNotificationType.PastDueDate;
}

export interface DueDateChangedUserNotification extends TaskUserNotification {
  type: UserNotificationType.DueDateChanged;
}

export interface StateUpdateUserNotification extends TaskUserNotification {
  type: UserNotificationType.StateUpdate;
}

export interface TaskUpdatedUserNotification extends TaskUserNotification {
  type: UserNotificationType.TaskUpdated;
}

export interface TaskRemovedUserNotification extends TaskUserNotification {
  type: UserNotificationType.TaskRemoved;
}

export interface TaskUnassignedUserNotification extends TaskUserNotification {
  type: UserNotificationType.TaskUnassigned;
}

export interface BulkActionUserNotification extends DocumentUserNotification {
  type: UserNotificationType.BulkAction;
}

export type UserNotification =
  | OrganizationSharedUserNotification
  | ProjectSharedUserNotification
  | CollectionSharedUserNotification
  | ViewSharedUserNotification
  | TaskAssignedUserNotification
  | TaskReopenedUserNotification
  | DueDateSoonUserNotification
  | PastDueDateUserNotification
  | DueDateChangedUserNotification
  | StateUpdateUserNotification
  | TaskUpdatedUserNotification
  | TaskRemovedUserNotification
  | TaskUnassignedUserNotification
  | TaskChangedUserNotification
  | CommentedUserNotification
  | MentionedUserNotification
  | BulkActionUserNotification;
