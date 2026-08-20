PRAGMA foreign_keys = ON;

CREATE TABLE app_user (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT,
  access_subject TEXT UNIQUE,
  avatar_url TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  last_seen_at TEXT,
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE app_role (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  section TEXT,
  is_system INTEGER NOT NULL DEFAULT 1 CHECK (is_system IN (0, 1)),
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE user_role (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES app_role(code) ON DELETE CASCADE,
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_code)
);

CREATE TABLE app_session (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  access_jti TEXT UNIQUE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent TEXT,
  ip_address TEXT,
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE demand_category (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  departments TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(departments) AND json_type(departments) = 'array'),
  section TEXT,
  form_fields TEXT CHECK (form_fields IS NULL OR (json_valid(form_fields) AND json_type(form_fields) = 'array')),
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE demand (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  background TEXT NOT NULL,
  expected_value TEXT,
  department TEXT NOT NULL,
  expected_online_time TEXT,
  creator TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  image TEXT CHECK (image IS NULL OR (json_valid(image) AND json_type(image) = 'object')),
  category_id TEXT NOT NULL REFERENCES demand_category(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT '待处理',
  assignee TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  follow_up_feedback TEXT,
  gmv_level TEXT,
  efficiency_affected TEXT,
  efficiency_saved_minutes TEXT,
  demand_type TEXT,
  is_blocking INTEGER CHECK (is_blocking IS NULL OR is_blocking IN (0, 1)),
  priority TEXT,
  manual_score REAL,
  planned_schedule TEXT,
  submitter_name TEXT,
  custom_fields TEXT CHECK (custom_fields IS NULL OR (json_valid(custom_fields) AND json_type(custom_fields) = 'object')),
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE demand_comment (
  id TEXT PRIMARY KEY NOT NULL,
  demand_id TEXT NOT NULL REFERENCES demand(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE merged_demand (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES demand_category(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT '待处理',
  assignee TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  follow_up_feedback TEXT,
  manual_score REAL,
  planned_schedule TEXT,
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE merged_demand_source (
  id TEXT PRIMARY KEY NOT NULL,
  merged_demand_id TEXT NOT NULL REFERENCES merged_demand(id) ON DELETE CASCADE,
  demand_id TEXT NOT NULL UNIQUE REFERENCES demand(id) ON DELETE CASCADE,
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  UNIQUE (merged_demand_id, demand_id)
);

CREATE TABLE rule (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  reason TEXT,
  effective_time TEXT,
  scope TEXT,
  status TEXT NOT NULL DEFAULT '待审批',
  creator TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  reviewer TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  review_feedback TEXT,
  reviewed_at TEXT,
  section TEXT,
  file TEXT CHECK (file IS NULL OR (json_valid(file) AND json_type(file) = 'object')),
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_app_user_active ON app_user(active);
CREATE INDEX idx_user_role_role_code ON user_role(role_code);
CREATE INDEX idx_app_session_user_id ON app_session(user_id);
CREATE INDEX idx_app_session_expires_at ON app_session(expires_at);
CREATE INDEX idx_app_session_active
  ON app_session(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_demand_category_enabled ON demand_category(enabled);
CREATE INDEX idx_demand_category_section ON demand_category(section);
CREATE INDEX idx_demand_category_list ON demand_category(_created_at DESC);

CREATE INDEX idx_demand_category_id ON demand(category_id);
CREATE INDEX idx_demand_category_created_at ON demand(category_id, _created_at DESC);
CREATE INDEX idx_demand_creator ON demand(creator);
CREATE INDEX idx_demand_assignee ON demand(assignee);
CREATE INDEX idx_demand_status ON demand(status);

CREATE INDEX idx_demand_comment_demand ON demand_comment(demand_id);
CREATE INDEX idx_demand_comment_demand_created_at
  ON demand_comment(demand_id, _created_at);

CREATE INDEX idx_merged_demand_category ON merged_demand(category_id);
CREATE INDEX idx_merged_demand_category_created_at
  ON merged_demand(category_id, _created_at DESC);
CREATE INDEX idx_merged_demand_assignee ON merged_demand(assignee);
CREATE INDEX idx_merged_demand_status ON merged_demand(status);
CREATE INDEX idx_mds_merged ON merged_demand_source(merged_demand_id);

CREATE INDEX idx_rule_status ON rule(status);
CREATE INDEX idx_rule_section ON rule(section);
CREATE INDEX idx_rule_section_status ON rule(section, status);
CREATE INDEX idx_rule_creator ON rule(creator);
CREATE INDEX idx_rule_created_at ON rule(_created_at DESC);

INSERT INTO app_role (code, name, description, section) VALUES
  ('super_admin', '超级管理员', '管理用户角色并拥有全部管理权限', NULL),
  ('demand_admin', '需求管理员', '管理全部需求栏目、需求整合和规则', NULL),
  ('admin_goods', '货品管理员', '管理消费券与货品板块', '消费券&货品板块'),
  ('admin_coupon', '消费券管理员', '管理消费券与货品板块', '消费券&货品板块'),
  ('admin_replenish', '追补管理员', '管理追补板块', '追补板块'),
  ('admin_content', '内容场管理员', '管理内容场板块', '内容场板块'),
  ('admin_shelf', '货架场管理员', '管理货架场板块', '货架场板块'),
  ('admin_campaign', '大促运营工具包管理员', '管理大促运营工具包板块', '大促运营工具包板块');
