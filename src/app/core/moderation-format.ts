import { dayTime } from './dates';
import type {
  AccountStanding,
  CaseStatus,
  CaseView,
  CommentModerationState,
  FlagStatus,
  ModerationActionType,
  ModerationDecision,
  ModerationOperation,
  ModerationReason,
  ModerationTargetType,
  ProfilePart,
  ProjectModerationState,
  Suspension,
  TargetState,
} from './types';

/** The backend's limits on what a decision says. */
export const PUBLIC_MESSAGE_MAX = 1_000;
export const INTERNAL_NOTE_MAX = 2_000;

/** What staff type before a deletion goes out. */
export const CONFIRM_WORD = 'DELETE';

export const REASON_LABELS: Record<ModerationReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  HATE: 'Hate',
  SEXUAL_CONTENT: 'Sexual content',
  VIOLENCE: 'Violence',
  ILLEGAL: 'Illegal',
  IMPERSONATION: 'Impersonation',
  STOLEN_CONTENT: 'Stolen content',
  OTHER: 'Other',
};

export const TARGET_TYPE_LABELS: Record<ModerationTargetType, string> = {
  USER: 'Profile',
  PROJECT: 'Game',
  COMMENT: 'Comment',
};

const TARGET_NOUNS: Record<ModerationTargetType, string> = {
  USER: 'account',
  PROJECT: 'game',
  COMMENT: 'comment',
};

export const CASE_VIEW_LABELS: Record<CaseView, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  ALL: 'All',
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
};

const CASE_STATUS_CHIPS: Record<CaseStatus, string> = {
  OPEN: 'nc-chip nc-chip-warn',
  RESOLVED: 'nc-chip nc-chip-ok',
};

export function caseStatusChip(status: CaseStatus): string {
  return CASE_STATUS_CHIPS[status];
}

export const FLAG_STATUS_LABELS: Record<FlagStatus, string> = {
  OPEN: 'Open',
  ACTIONED: 'Acted on',
  DISMISSED: 'Dismissed',
};

const FLAG_STATUS_CHIPS: Record<FlagStatus, string> = {
  OPEN: 'nc-chip nc-chip-warn',
  ACTIONED: 'nc-chip nc-chip-ok',
  DISMISSED: 'nc-chip nc-chip-quiet',
};

export function flagStatusChip(status: FlagStatus): string {
  return FLAG_STATUS_CHIPS[status];
}

export const TARGET_STATE_LABELS: Record<TargetState, string> = {
  VISIBLE: 'Visible',
  UNPUBLISHED: 'Unpublished',
  HIDDEN: 'Hidden',
  SUSPENDED: 'Suspended',
  DELETED: 'Deleted',
  GONE: 'Gone',
};

const TARGET_STATE_CHIPS: Record<TargetState, string> = {
  VISIBLE: 'nc-chip nc-chip-ok',
  UNPUBLISHED: 'nc-chip nc-chip-quiet',
  HIDDEN: 'nc-chip nc-chip-danger',
  SUSPENDED: 'nc-chip nc-chip-danger',
  DELETED: 'nc-chip nc-chip-quiet',
  GONE: 'nc-chip nc-chip-quiet',
};

export function targetStateChip(state: TargetState): string {
  return TARGET_STATE_CHIPS[state];
}

export const STANDING_LABELS: Record<AccountStanding, string> = {
  GOOD: 'Good standing',
  WARNED: 'Warned',
  SUSPENDED: 'Suspended',
};

const STANDING_CHIPS: Record<AccountStanding, string> = {
  GOOD: 'nc-chip nc-chip-ok',
  WARNED: 'nc-chip nc-chip-warn',
  SUSPENDED: 'nc-chip nc-chip-danger',
};

export function standingChip(standing: AccountStanding): string {
  return STANDING_CHIPS[standing];
}

export const PROJECT_STATE_LABELS: Record<ProjectModerationState, string> = {
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
  HIDDEN: 'Hidden',
};

const PROJECT_STATE_CHIPS: Record<ProjectModerationState, string> = {
  PUBLISHED: 'nc-chip nc-chip-ok',
  UNPUBLISHED: 'nc-chip nc-chip-quiet',
  HIDDEN: 'nc-chip nc-chip-danger',
};

export function projectStateChip(state: ProjectModerationState): string {
  return PROJECT_STATE_CHIPS[state];
}

export const COMMENT_STATE_LABELS: Record<CommentModerationState, string> = {
  VISIBLE: 'Visible',
  HIDDEN: 'Hidden',
  DELETED: 'Deleted',
};

const COMMENT_STATE_CHIPS: Record<CommentModerationState, string> = {
  VISIBLE: 'nc-chip nc-chip-ok',
  HIDDEN: 'nc-chip nc-chip-danger',
  DELETED: 'nc-chip nc-chip-quiet',
};

export function commentStateChip(state: CommentModerationState): string {
  return COMMENT_STATE_CHIPS[state];
}

export const PROFILE_PART_LABELS: Record<ProfilePart, string> = {
  NICKNAME: 'Nickname',
  DESCRIPTION: 'Description',
  PICTURE: 'Picture',
  BACKGROUND: 'Background',
};

export const ACTION_LABELS: Record<ModerationActionType, string> = {
  ACCOUNT_WARNED: 'Warned the account',
  ACCOUNT_SUSPENDED: 'Suspended the account',
  ACCOUNT_REINSTATED: 'Reinstated the account',
  ACCOUNT_DELETED: 'Deleted the account',
  PROFILE_CLEARED: 'Cleared the profile',
  ROLE_CHANGED: 'Changed the role',
  PROJECT_HIDDEN: 'Hid the game',
  PROJECT_RESTORED: 'Restored the game',
  PROJECT_DELETED: 'Deleted the game',
  COMMENT_HIDDEN: 'Hid the comment',
  COMMENT_RESTORED: 'Restored the comment',
  COMMENT_DELETED: 'Deleted the comment',
  FLAGS_DISMISSED: 'Dismissed the reports',
  DRAFT_VIEWED: 'Previewed the game',
};

type ActionTone = 'danger' | 'warn' | 'ok' | 'quiet';

const ACTION_TONES: Record<ModerationActionType, ActionTone> = {
  ACCOUNT_WARNED: 'warn',
  ACCOUNT_SUSPENDED: 'danger',
  ACCOUNT_REINSTATED: 'ok',
  ACCOUNT_DELETED: 'danger',
  PROFILE_CLEARED: 'warn',
  ROLE_CHANGED: 'quiet',
  PROJECT_HIDDEN: 'danger',
  PROJECT_RESTORED: 'ok',
  PROJECT_DELETED: 'danger',
  COMMENT_HIDDEN: 'danger',
  COMMENT_RESTORED: 'ok',
  COMMENT_DELETED: 'danger',
  FLAGS_DISMISSED: 'quiet',
  DRAFT_VIEWED: 'quiet',
};

export function actionChip(action: ModerationActionType): string {
  return `nc-chip nc-chip-${ACTION_TONES[action]}`;
}

/** Where the console shows a target. A comment has no page of its own. */
export function panelRoute(type: ModerationTargetType, id: number): (string | number)[] | null {
  switch (type) {
    case 'USER':
      return ['/moderation/users', id];
    case 'PROJECT':
      return ['/moderation/games', id];
    case 'COMMENT':
      return null;
  }
}

export function caseRoute(type: ModerationTargetType, id: number): (string | number)[] {
  return ['/moderation/cases', type, id];
}

export type SuspensionChoice = '1' | '7' | '30' | 'indefinite';

export const SUSPENSION_CHOICES: { value: SuspensionChoice; label: string }[] = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: 'indefinite', label: 'Until reinstated' },
];

export function suspensionDays(choice: SuspensionChoice): number | null {
  return choice === 'indefinite' ? null : Number(choice);
}

export function suspensionLabel(suspension: Suspension): string {
  return suspension.until === null
    ? 'Until staff reinstate it'
    : `Until ${dayTime(suspension.until)} UTC`;
}

/** What the dialog of an operation asks for. */
export interface OperationForm {
  reason: boolean;
  message: 'none' | 'optional' | 'required';
  resolveFlags: boolean;
  duration: boolean;
  parts: boolean;
  publishedGames: boolean;
  typeToConfirm: boolean;
  danger: boolean;
}

const NOTE_ONLY: OperationForm = {
  reason: false,
  message: 'none',
  resolveFlags: false,
  duration: false,
  parts: false,
  publishedGames: false,
  typeToConfirm: false,
  danger: false,
};
const LIFT: OperationForm = { ...NOTE_ONLY, message: 'optional' };
const DECISION: OperationForm = {
  ...NOTE_ONLY,
  reason: true,
  message: 'optional',
  resolveFlags: true,
  danger: true,
};

const OPERATION_FORMS: Record<ModerationOperation, OperationForm> = {
  DISMISS: NOTE_ONLY,
  HIDE: DECISION,
  RESTORE: LIFT,
  DELETE: { ...DECISION, typeToConfirm: true },
  WARN: { ...DECISION, message: 'required' },
  SUSPEND: { ...DECISION, message: 'required', duration: true },
  REINSTATE: LIFT,
  CLEAR_PROFILE: { ...DECISION, parts: true },
  DELETE_ACCOUNT: { ...DECISION, message: 'none', publishedGames: true, typeToConfirm: true },
};

export function operationForm(operation: ModerationOperation): OperationForm {
  return OPERATION_FORMS[operation];
}

const ACCOUNT_OPERATION_LABELS: Record<
  Exclude<ModerationOperation, 'HIDE' | 'RESTORE' | 'DELETE'>,
  string
> = {
  DISMISS: 'Dismiss the reports',
  WARN: 'Warn the account',
  SUSPEND: 'Suspend the account',
  REINSTATE: 'Reinstate the account',
  CLEAR_PROFILE: 'Clear the profile',
  DELETE_ACCOUNT: 'Delete the account',
};

/** An operation as a button names it. HIDE, RESTORE and DELETE name the game or the comment. */
export function operationLabel(
  operation: ModerationOperation,
  targetType: ModerationTargetType,
): string {
  switch (operation) {
    case 'HIDE':
      return `Hide the ${TARGET_NOUNS[targetType]}`;
    case 'RESTORE':
      return `Restore the ${TARGET_NOUNS[targetType]}`;
    case 'DELETE':
      return `Delete the ${TARGET_NOUNS[targetType]}`;
    default:
      return ACCOUNT_OPERATION_LABELS[operation];
  }
}

/** What an operation does, said above the form before it is sent. */
export function operationEffect(
  operation: ModerationOperation,
  targetType: ModerationTargetType,
): string {
  const noun = TARGET_NOUNS[targetType];
  switch (operation) {
    case 'DISMISS':
      return 'Closes the open reports with nothing done about what they report.';
    case 'HIDE':
      return `Takes the ${noun} off the site. Its owner is told, and it can be restored.`;
    case 'RESTORE':
      return `Puts the ${noun} back on the site.`;
    case 'DELETE':
      return `Removes the ${noun} for good. This cannot be undone.`;
    case 'WARN':
      return 'Sends the account a warning that stays on its standing.';
    case 'SUSPEND':
      return 'The account still signs in and reads. Nothing it does is saved until the suspension ends.';
    case 'REINSTATE':
      return 'Ends the suspension now.';
    case 'CLEAR_PROFILE':
      return 'Empties the chosen parts of the profile. The account is told.';
    case 'DELETE_ACCOUNT':
      return 'Erases the account for good. This cannot be undone.';
  }
}

/** What staff have filled in so far. */
export interface DecisionDraft {
  reason: ModerationReason | null;
  publicMessage: string;
  internalNote: string;
  resolveFlags: boolean;
  duration: SuspensionChoice;
  parts: ProfilePart[];
  removePublishedGames: boolean;
  confirmation: string;
}

export function emptyDraft(reason: ModerationReason | null = null): DecisionDraft {
  return {
    reason,
    publicMessage: '',
    internalNote: '',
    resolveFlags: true,
    duration: '7',
    parts: [],
    removePublishedGames: false,
    confirmation: '',
  };
}

/** What still keeps a draft from being sent, or null when it can go. */
export function draftProblem(operation: ModerationOperation, draft: DecisionDraft): string | null {
  const form = operationForm(operation);
  if (form.reason && draft.reason === null) {
    return 'Choose a reason';
  }
  if (form.message === 'required' && draft.publicMessage.trim() === '') {
    return 'Say what the account is told';
  }
  if (form.parts && draft.parts.length === 0) {
    return 'Choose what to clear';
  }
  if (form.typeToConfirm && draft.confirmation !== CONFIRM_WORD) {
    return `Type ${CONFIRM_WORD} to confirm`;
  }
  return null;
}

/** The body an operation sends: only the fields its route accepts, with empty text left out. */
export function decisionOf(
  operation: ModerationOperation,
  draft: DecisionDraft,
): ModerationDecision {
  const form = operationForm(operation);
  const body: ModerationDecision = {};
  const message = draft.publicMessage.trim();
  const note = draft.internalNote.trim();
  if (form.reason && draft.reason !== null) {
    body.reason = draft.reason;
  }
  if (form.message !== 'none' && message !== '') {
    body.publicMessage = message;
  }
  if (note !== '') {
    body.internalNote = note;
  }
  if (form.resolveFlags) {
    body.resolveFlags = draft.resolveFlags;
  }
  const days = suspensionDays(draft.duration);
  if (form.duration && days !== null) {
    body.durationDays = days;
  }
  if (form.parts) {
    body.parts = draft.parts;
  }
  if (form.publishedGames) {
    body.removePublishedGames = draft.removePublishedGames;
    body.confirmation = CONFIRM_WORD;
  }
  return body;
}

/** The reason reported most, to offer first in the dialog. Ties go to the first reported. */
export function leadingReason(reasons: readonly ModerationReason[]): ModerationReason | null {
  const counts = new Map<ModerationReason, number>();
  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  let leading: ModerationReason | null = null;
  for (const [reason, count] of counts) {
    if (leading === null || count > (counts.get(leading) ?? 0)) {
      leading = reason;
    }
  }
  return leading;
}
