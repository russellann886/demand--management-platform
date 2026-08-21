CREATE TABLE app_credential (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TEXT,
  password_changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _created_by TEXT REFERENCES app_user(id) ON DELETE SET NULL,
  _updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  _updated_by TEXT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_app_credential_locked_until
  ON app_credential(locked_until);

CREATE INDEX idx_app_session_token
  ON app_session(access_jti, expires_at)
  WHERE revoked_at IS NULL;
