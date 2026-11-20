import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type { OperationRequest } from './moderation-format';
import type {
  AccountStanding,
  CaseDetail,
  CaseSort,
  CaseSummary,
  CaseView,
  ModerationAccount,
  ModerationAccountDetail,
  ModerationAction,
  ModerationActionType,
  ModerationDecision,
  ModerationReason,
  ModerationTargetType,
  OpenCaseCount,
  Page,
  RoleName,
} from './types';

export interface CaseQuery {
  view: CaseView;
  targetType?: ModerationTargetType;
  reason?: ModerationReason;
  sort: CaseSort;
  page: number;
  limit: number;
}

export interface AccountQuery {
  search?: string;
  standing?: AccountStanding;
  role?: RoleName;
  page: number;
  limit: number;
}

export interface LogQuery {
  action?: ModerationActionType;
  actorId?: number;
  subjectUserId?: number;
  targetType?: ModerationTargetType;
  targetId?: number;
  page: number;
  limit: number;
}

/** What users reported and what staff did about it, from the backend's `admin/moderation` routes. */
@Injectable({ providedIn: 'root' })
export class ModerationApi {
  private readonly api = inject(ApiService);

  cases(query: CaseQuery): Promise<Page<CaseSummary>> {
    return this.api.get('/admin/moderation/cases', { ...query });
  }

  openCaseCount(): Promise<OpenCaseCount> {
    return this.api.get('/admin/moderation/cases/count');
  }

  /** Every report on one target, with what staff did about it and may still do. */
  case(type: ModerationTargetType, id: number): Promise<CaseDetail> {
    return this.api.get(`/admin/moderation/cases/${type}/${id}`);
  }

  accounts(query: AccountQuery): Promise<Page<ModerationAccount>> {
    return this.api.get('/admin/moderation/accounts', { ...query });
  }

  account(id: number): Promise<ModerationAccountDetail> {
    return this.api.get(`/admin/moderation/accounts/${id}`);
  }

  /** What staff did, newest first. */
  log(query: LogQuery): Promise<Page<ModerationAction>> {
    return this.api.get('/admin/moderation/log', { ...query });
  }

  /** Sends a decision to the route `operationRequest` gave for it. */
  async decide(request: OperationRequest, decision: ModerationDecision): Promise<void> {
    await (request.method === 'DELETE'
      ? this.api.delete(request.path, decision)
      : this.api.post(request.path, decision));
  }
}
