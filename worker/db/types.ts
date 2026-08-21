export type DbBoolean = 0 | 1;
export type DbJson = string;
export type DbTimestamp = string;
export type UserId = string;

export type FileAttachment = {
  bucketId: string;
  filePath: string;
};

export interface AuditColumns {
  _created_at: DbTimestamp;
  _created_by: UserId | null;
  _updated_at: DbTimestamp;
  _updated_by: UserId | null;
}

export interface AppUserRow extends AuditColumns {
  id: UserId;
  email: string;
  display_name: string | null;
  access_subject: string | null;
  avatar_url: string | null;
  active: DbBoolean;
  last_seen_at: DbTimestamp | null;
}

export interface AppRoleRow extends AuditColumns {
  code: string;
  name: string;
  description: string;
  section: string | null;
  is_system: DbBoolean;
}

export interface UserRoleRow extends AuditColumns {
  user_id: UserId;
  role_code: string;
}

export interface AppSessionRow extends AuditColumns {
  id: string;
  user_id: UserId;
  access_jti: string | null;
  expires_at: DbTimestamp;
  last_seen_at: DbTimestamp;
  revoked_at: DbTimestamp | null;
  user_agent: string | null;
  ip_address: string | null;
}

export interface AppCredentialRow extends AuditColumns {
  user_id: UserId;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  must_change_password: DbBoolean;
  failed_attempts: number;
  locked_until: DbTimestamp | null;
  password_changed_at: DbTimestamp;
}

export interface DemandCategoryRow extends AuditColumns {
  id: string;
  name: string;
  description: string;
  enabled: DbBoolean;
  departments: DbJson;
  section: string | null;
  form_fields: DbJson | null;
}

export interface DemandRow extends AuditColumns {
  id: string;
  title: string;
  background: string;
  expected_value: string | null;
  department: string;
  expected_online_time: DbTimestamp | null;
  creator: UserId | null;
  image: DbJson | null;
  category_id: string;
  status: string;
  assignee: UserId | null;
  follow_up_feedback: string | null;
  gmv_level: string | null;
  efficiency_affected: string | null;
  efficiency_saved_minutes: string | null;
  demand_type: string | null;
  is_blocking: DbBoolean | null;
  priority: string | null;
  manual_score: number | null;
  planned_schedule: DbTimestamp | null;
  submitter_name: string | null;
  custom_fields: DbJson | null;
}

export interface DemandCommentRow extends AuditColumns {
  id: string;
  demand_id: string;
  user_id: UserId;
  content: string;
}

export interface MergedDemandRow extends AuditColumns {
  id: string;
  title: string;
  reason: string;
  category_id: string;
  status: string;
  assignee: UserId | null;
  follow_up_feedback: string | null;
  manual_score: number | null;
  planned_schedule: DbTimestamp | null;
}

export interface MergedDemandSourceRow extends AuditColumns {
  id: string;
  merged_demand_id: string;
  demand_id: string;
}

export interface RuleRow extends AuditColumns {
  id: string;
  name: string;
  type: string;
  content: string;
  reason: string | null;
  effective_time: DbTimestamp | null;
  scope: string | null;
  status: string;
  creator: UserId | null;
  reviewer: UserId | null;
  review_feedback: string | null;
  reviewed_at: DbTimestamp | null;
  section: string | null;
  file: DbJson | null;
}

export interface WorkerBindings {
  APP_ENV?: string;
  ACCESS_AUD?: string;
  DEV_USER_EMAIL?: string;
  DEV_USER_NAME?: string;
  SUPER_ADMIN_EMAILS?: string;
  OPENAPI_DEMAND_TOKEN?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  DB: D1Database;
  FILES: KVNamespace;
}
