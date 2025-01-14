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

import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {isBackendUrl} from '../../api/api.utils';
import {ConfigurationService} from '../../../configuration/configuration.service';
import {AppIdService} from '../../service/app-id.service';

export const correlationIdHeader = 'X-Lumeer-Correlation-Id';
export const appIdHeader = 'X-Lumeer-App-Id';

@Injectable()
export class CorrelationIdHttpInterceptor implements HttpInterceptor {
  constructor(private configurationService: ConfigurationService, private appId: AppIdService) {}

  public intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!isBackendUrl(request.url, this.configurationService.getConfiguration())) {
      return next.handle(request);
    }

    if (request.body?.correlationId) {
      const requestClone = request.clone({
        setHeaders: {
          [correlationIdHeader]: request.body.correlationId,
          [appIdHeader]: this.appId.getAppId(),
        },
      });
      return next.handle(requestClone);
    }

    const requestClone = request.clone({
      setHeaders: {[appIdHeader]: this.appId.getAppId()},
    });
    return next.handle(requestClone);
  }
}
