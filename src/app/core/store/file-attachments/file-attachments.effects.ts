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

import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Action, select, Store} from '@ngrx/store';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, map, mergeMap, take, withLatestFrom} from 'rxjs/operators';
import {FileAttachmentDto} from '../../dto/file-attachment.dto';
import {selectWorkspaceWithIds} from '../common/common.selectors';
import {selectCollectionsByCustomViewAndQuery, selectReadableCollectionsByView} from '../common/permissions.selectors';
import {checkTasksCollectionsQuery, getAllLinkTypeIdsFromQuery} from '../navigation/query/query.util';
import {createCallbackActions, emitErrorActions} from '../utils/store.utils';
import {convertFileAttachmentDtoToModel, convertFileAttachmentModelToDto} from './file-attachment.converter';
import {FileAttachmentsAction, FileAttachmentsActionType} from './file-attachments.action';
import {AttachmentsService} from '../../data-service';
import {createFileApiPath, FileApiPath} from '../../data-service/attachments/attachments.service';
import {selectLoadedFileAttachmentsCollections, selectLoadedFileAttachmentsLinkTypes} from './file-attachments.state';
import {AppState} from '../app.state';
import {selectCurrentView, selectViewById} from '../views/views.state';
import {Perspective} from '../../../view/perspectives/perspective';
import {CollectionPurposeType} from '../collections/collection';

@Injectable()
export class FileAttachmentsEffects {
  public create$ = createEffect(() =>
    this.actions$.pipe(
      ofType<FileAttachmentsAction.Create>(FileAttachmentsActionType.CREATE),
      withLatestFrom(this.store$.pipe(select(selectWorkspaceWithIds))),
      mergeMap(([action, workspace]) => {
        const path = createFileApiPath(workspace, action.payload.fileAttachment);
        const dto = convertFileAttachmentModelToDto(action.payload.fileAttachment, workspace);

        return this.attachmentsService.createFiles(path, [dto]).pipe(
          map(files => files.map(file => convertFileAttachmentDtoToModel(file, true))),
          mergeMap(fileAttachments => [
            new FileAttachmentsAction.CreateSuccess({fileAttachments}),
            ...createCallbackActions(action.payload.onSuccess, fileAttachments[0]),
          ]),
          catchError(error => emitErrorActions(error, action.payload.onFailure))
        );
      })
    )
  );

  public remove$ = createEffect(() =>
    this.actions$.pipe(
      ofType<FileAttachmentsAction.Remove>(FileAttachmentsActionType.REMOVE),
      withLatestFrom(this.store$.pipe(select(selectWorkspaceWithIds))),
      mergeMap(([action, workspace]) => {
        const {fileId, onSuccess, onFailure} = action.payload;
        return this.attachmentsService.removeFile(workspace, fileId).pipe(
          mergeMap(() => [
            new FileAttachmentsAction.RemoveSuccess({fileIds: [fileId]}),
            ...createCallbackActions(onSuccess),
          ]),
          catchError(error => emitErrorActions(error, onFailure))
        );
      })
    )
  );

  public get$ = createEffect(() =>
    this.actions$.pipe(
      ofType<FileAttachmentsAction.Get>(FileAttachmentsActionType.GET),
      withLatestFrom(this.store$.pipe(select(selectWorkspaceWithIds))),
      mergeMap(([action, workspace]) => {
        const path = createFileApiPath(workspace, action.payload);

        return (action.payload.collectionId ? this.getDocumentFiles(path) : this.getLinkFiles(path)).pipe(
          map(files => files.map(file => convertFileAttachmentDtoToModel(file))),
          mergeMap(fileAttachments => [
            new FileAttachmentsAction.GetSuccess({fileAttachments, path}),
            ...createCallbackActions(action.payload.onSuccess, fileAttachments),
          ]),
          catchError(error => emitErrorActions(error, action.payload.onFailure))
        );
      })
    )
  );

  public getByView$ = createEffect(() =>
    this.actions$.pipe(
      ofType<FileAttachmentsAction.GetByView>(FileAttachmentsActionType.GET_BY_VIEW),
      mergeMap(action => {
        const {viewId} = action.payload;

        return this.store$.pipe(
          select(selectViewById(viewId)),
          take(1),
          mergeMap(view => {
            if (view?.perspective === Perspective.Search) {
              return this.store$.pipe(
                select(selectReadableCollectionsByView(view)),
                take(1),
                map(collections =>
                  collections.filter(collection => collection.purpose?.type === CollectionPurposeType.Tasks)
                ),
                map(collections => checkTasksCollectionsQuery(collections, view.query, {})),
                map(query => new FileAttachmentsAction.GetByQuery({view, query}))
              );
            } else if (view) {
              return of(new FileAttachmentsAction.GetByQuery({view, query: view.query}));
            }
            return EMPTY;
          })
        );
      })
    )
  );

  public getByQuery$ = createEffect(() =>
    this.actions$.pipe(
      ofType<FileAttachmentsAction.GetByQuery>(FileAttachmentsActionType.GET_BY_QUERY),
      mergeMap(action => {
        const {query, view} = action.payload;

        const view$ = view ? of(view) : this.store$.pipe(select(selectCurrentView));

        return view$.pipe(
          take(1),
          mergeMap(view =>
            this.store$.pipe(
              select(selectCollectionsByCustomViewAndQuery(view, query)),
              take(1),
              withLatestFrom(
                this.store$.pipe(select(selectLoadedFileAttachmentsCollections)),
                this.store$.pipe(select(selectLoadedFileAttachmentsLinkTypes))
              ),
              mergeMap(([collections, loadedCollections, loadedLinkTypes]) => {
                const collectionIds = collections.map(collection => collection.id);
                const linkTypesIds = getAllLinkTypeIdsFromQuery(query);

                const actions: Action[] = [];
                collectionIds
                  .filter(collectionId => !loadedCollections.includes(collectionId))
                  .forEach(collectionId => actions.push(new FileAttachmentsAction.Get({collectionId})));
                linkTypesIds
                  .filter(linkTypeId => !loadedLinkTypes.includes(linkTypeId))
                  .forEach(linkTypeId => actions.push(new FileAttachmentsAction.Get({linkTypeId})));
                return actions;
              })
            )
          )
        );
      })
    )
  );

  private getDocumentFiles(path: FileApiPath): Observable<FileAttachmentDto[]> {
    if (path.collectionId && path.documentId && path.attributeId) {
      return this.attachmentsService.getFilesByDocumentAttribute(path);
    }

    if (path.collectionId && path.documentId) {
      return this.attachmentsService.getFilesByDocument(path);
    }

    return this.attachmentsService.getFilesByCollection(path);
  }

  private getLinkFiles(path: FileApiPath): Observable<FileAttachmentDto[]> {
    if (path.linkTypeId && path.linkInstanceId && path.attributeId) {
      return this.attachmentsService.getFilesByLinkInstanceAttribute(path);
    }

    if (path.linkTypeId && path.linkInstanceId) {
      return this.attachmentsService.getFilesByLinkInstance(path);
    }

    return this.attachmentsService.getFilesByLinkType(path);
  }

  constructor(
    private actions$: Actions,
    private attachmentsService: AttachmentsService,
    private store$: Store<AppState>
  ) {}
}
