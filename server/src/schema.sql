CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  status        TEXT NOT NULL DEFAULT 'active'   CHECK (status IN ('active', 'blocked')),
  avatar        TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- emails are unique regardless of upper/lower case
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- which dashboard menus a role can open (only 'staff' rows are editable)
CREATE TABLE IF NOT EXISTS role_permissions (
  role       TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'customer')),
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);