import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type { OperationRequest } from './moderation-format';
import type {
  AccountStanding,
  CaseDetail,
  CaseSort,
  CaseSummary,
  CaseView,
  CommentModerationState,
  ModerationAccount,
  ModerationAccountDetail,
  ModerationAction,
  ModerationActionType,
  ModerationComment,
  ModerationDecision,
  ModerationProject,
  ModerationProjectDetail,
  ModerationReason,
  ModerationTargetType,
  OpenCaseCount,
  Page,
  ProjectModerationState,
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

export interface ProjectQuery {
  search?: string;
  state?: ProjectModerationState;
  creatorId?: string;
  page: number;
  limit: number;
}

export interface CommentQuery {
  search?: string;
  state?: CommentModerationState;
  projectId?: string;
  authorId?: string;
  page: number;
  limit: number;
}

export interface LogQuery {
  action?: ModerationActionType;
  actorId?: string;
  subjectUserId?: string;
  targetType?: ModerationTargetType;
  targetId?: string;
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
  case(type: ModerationTargetType, id: string): Promise<CaseDetail> {
    return this.api.get(`/admin/moderation/cases/${type}/${id}`);
  }

  accounts(query: AccountQuery): Promise<Page<ModerationAccount>> {
    return this.api.get('/admin/moderation/accounts', { ...query });
  }

  account(id: string): Promise<ModerationAccountDetail> {
    return this.api.get(`/admin/moderation/accounts/${id}`);
  }

  projects(query: ProjectQuery): Promise<Page<ModerationProject>> {
    return this.api.get('/admin/moderation/projects', { ...query });
  }

  project(id: string): Promise<ModerationProjectDetail> {
    return this.api.get(`/admin/moderation/projects/${id}`);
  }

  /** The cover as bytes, withheld or not: an `<img>` cannot send the bearer. */
  projectCover(id: string): Promise<Blob> {
    return this.api.getBlob(`/admin/moderation/projects/${id}/cover`);
  }

  comments(query: CommentQuery): Promise<Page<ModerationComment>> {
    return this.api.get('/admin/moderation/comments', { ...query });
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
