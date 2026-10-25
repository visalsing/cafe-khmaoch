-- Cafe Khmaoch database schema (upgrade + full create)
-- Safe to run repeatedly: it creates what is missing and upgrades a database
-- created by the OLD schema.sql, preserving existing rows.
-- Back up the database before running it.
-- Do NOT append the old schema.sql after this file.

BEGIN;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Tables that may be missing in an older installation
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS country_flags (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name JSONB NOT NULL,                              -- {"en":"Cambodia","km":"កម្ពុជា"}
  native_name TEXT NOT NULL DEFAULT '',
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  img TEXT NOT NULL DEFAULT '',                     -- raster image (1 upload -> img + thumbnail)
  thumbnail TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',                    -- emoji, e.g. 🇰🇭
  svg TEXT NOT NULL DEFAULT '',                     -- independent SVG upload
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT country_flags_name_has_en
    CHECK (name ? 'en' AND length(name->>'en') > 0)
);

CREATE TABLE IF NOT EXISTS genders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gender JSONB NOT NULL,
  sc_gender JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_title JSONB NOT NULL DEFAULT '{}'::jsonb,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),   -- 1 = active, 0 = hidden
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roles_title_has_en
    CHECK (role_title ? 'en' AND length(role_title->>'en') > 0)
);

-- Add the new role code before inserting/upgrading default roles.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS code TEXT;

-- Recover codes for rows created by the old schema. Do not overwrite a code
-- that has already been assigned.
UPDATE roles
SET code = lower(role_title->>'en')
WHERE code IS NULL
  AND lower(role_title->>'en') IN ('admin', 'staff', 'customer');

-- The unique index is created BEFORE the inserts, so ON CONFLICT can really
-- skip a role that already exists (no duplicate admin/staff/customer rows).
CREATE UNIQUE INDEX IF NOT EXISTS roles_code_idx ON roles (code);
CREATE INDEX IF NOT EXISTS roles_status_sort_idx ON roles (status, sort_num);

-- Insert missing standard roles.
INSERT INTO roles (code, role_title, description, sort_num)
VALUES
  ('admin', '{"en":"Admin"}', '{"en":"Full access to everything."}', 1),
  ('staff', '{"en":"Staff"}', '{"en":"Cafe team. Sees only the menus you allow."}', 2),
  ('customer', '{"en":"Customer"}', '{"en":"Regular website user. No dashboard access."}', 3)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS positions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  position_title JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {"en": ["Shop Owner", "Business Owner"], "km": [...]}
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT positions_title_has_en
    CHECK (position_title ? 'en' AND jsonb_array_length(position_title->'en') > 0)
);

CREATE INDEX IF NOT EXISTS positions_status_sort_idx ON positions (status, sort_num);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name JSONB NOT NULL DEFAULT '{}'::jsonb,
  slug TEXT NOT NULL UNIQUE DEFAULT '',             -- e.g. "menu_manage", "users_view"
  module TEXT NOT NULL DEFAULT 'general',           -- e.g. "menu", "settings", "reports"
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_num INTEGER NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT permissions_name_has_en
    CHECK (name ? 'en' AND length(name->>'en') > 0)
);

ALTER TABLE permissions ADD COLUMN IF NOT EXISTS admin_only BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS permissions_status_sort_idx ON permissions (status, sort_num);
CREATE INDEX IF NOT EXISTS permissions_slug_idx ON permissions (slug);

INSERT INTO permissions (slug, module, name, description, sort_num, admin_only)
VALUES
  ('dashboard', 'dashboard', '{"en":"Dashboard"}', '{"en":"Sales overview and stats"}', 1, false),
  ('pos', 'orders', '{"en":"POS"}', '{"en":"Take and charge orders at the counter"}', 2, false),
  ('orders', 'orders', '{"en":"Orders"}', '{"en":"View orders and change their status"}', 3, false),
  ('menu', 'menu', '{"en":"Menu Manager"}', '{"en":"Add, edit and hide menu items"}', 4, false),
  ('reports', 'reports', '{"en":"Reports"}', '{"en":"Sales reports and CSV export"}', 5, false),
  ('pages', 'pages', '{"en":"Pages & Hero"}', '{"en":"Edit website content"}', 6, false),
  ('users', 'users', '{"en":"Users"}', '{"en":"Manage customers (admins manage everyone)"}', 7, false),
  ('roles', 'users', '{"en":"Roles & Permissions"}', '{"en":"Change who can open what"}', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Existing users table: add new columns, migrate legacy role/status, preserve rows
-- ---------------------------------------------------------------------------

-- If users does not exist, create the old-compatible base first so the
-- following ALTER statements can safely upgrade it.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  avatar TEXT NOT NULL DEFAULT '',
  avatar_thumbnail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name_native TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name_native TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender_id INTEGER REFERENCES genders(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_id INTEGER REFERENCES permissions(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_removed SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- Add the nationality foreign key only after nationalities exists.
CREATE TABLE IF NOT EXISTS nationalities (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nationality JSONB NOT NULL,
  nation_code TEXT NOT NULL DEFAULT '',
  country_flags_id INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nationalities_name_has_en
    CHECK (nationality ? 'en' AND length(nationality->>'en') > 0)
);

CREATE INDEX IF NOT EXISTS nationalities_status_sort_idx ON nationalities (status, sort_num);
CREATE INDEX IF NOT EXISTS nationalities_country_flags_idx ON nationalities (country_flags_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nationality_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_nationality_id_fkey'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_nationality_id_fkey
      FOREIGN KEY (nationality_id) REFERENCES nationalities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Map old text role to role_id. This also handles a partially migrated database
-- where role_id exists but some rows are still NULL.
DO $$
DECLARE
  role_column_exists BOOLEAN;
  status_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'users'
      AND column_name = 'role'
  ) INTO role_column_exists;

  IF role_column_exists THEN
    EXECUTE $q$
      UPDATE users u
      SET role_id = r.id
      FROM roles r
      WHERE u.role_id IS NULL
        AND r.code = lower(u.role)
    $q$;
  END IF;

  UPDATE users
  SET role_id = (SELECT id FROM roles WHERE code = 'customer')
  WHERE role_id IS NULL;

  SELECT data_type INTO status_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'users'
    AND column_name = 'status';

  IF status_type IN ('text', 'character varying') THEN
    UPDATE users SET is_blocked = 1 WHERE status = 'blocked';
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_chk;
    ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN status TYPE SMALLINT
      -- USING (CASE WHEN status = 'active' THEN 1 ELSE 0 END);
      USING (CASE WHEN status IN ('active', 'blocked') THEN 1 ELSE 0 END);
    ALTER TABLE users ALTER COLUMN status SET DEFAULT 1;
  END IF;

  IF role_column_exists THEN
    ALTER TABLE users DROP COLUMN role;
  END IF;
END $$;

-- Ensure role_id is backed by the new roles table and required.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_id_fkey'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_chk;
ALTER TABLE users ADD CONSTRAINT users_status_chk CHECK (status IN (0, 1));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_is_blocked_chk;
ALTER TABLE users ADD CONSTRAINT users_is_blocked_chk CHECK (is_blocked IN (0, 1));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_is_removed_chk;
ALTER TABLE users ADD CONSTRAINT users_is_removed_chk CHECK (is_removed IN (0, 1));

-- Replace the old global email index with uniqueness among non-removed accounts.
DROP INDEX IF EXISTS users_email_lower_idx;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_idx
  ON users (lower(email)) WHERE is_removed = 0;
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role_id);
CREATE INDEX IF NOT EXISTS users_flags_idx ON users (is_removed, is_blocked, status);

-- ---------------------------------------------------------------------------
-- role_permissions: migrate old (role, permission) text pairs to foreign keys
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- role_permissions: migrate old text pairs to foreign keys
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('role_permissions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'role_permissions'
         AND column_name = 'role'
     )
     AND to_regclass('role_permissions_old') IS NULL THEN
    ALTER TABLE role_permissions RENAME TO role_permissions_old;
    
    ALTER INDEX IF EXISTS role_permissions_pkey RENAME TO role_permissions_old_pkey;  -- frees the name for the new table's primary key

  END IF;
END $$;

-- Create the new table if it does not exist.
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_role_permission_unique
    UNIQUE (role_id, permission_id)
);

-- Add missing columns if the table already existed.
ALTER TABLE role_permissions
  ADD COLUMN IF NOT EXISTS id SERIAL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure existing rows have unique IDs.
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_id_unique
  ON role_permissions (id);

-- Ensure role-permission combinations remain unique.
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_permission_unique
  ON role_permissions (role_id, permission_id);

-- Migrate the old text-based table if present.
DO $$
BEGIN
  IF to_regclass('role_permissions_old') IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM role_permissions_old old_rp
    JOIN roles r ON r.code = lower(old_rp.role)
    JOIN permissions p ON p.slug = old_rp.permission
    ON CONFLICT DO NOTHING;

    DROP TABLE role_permissions_old;
  END IF;
END $$;

-- Assign default staff permissions only when none are assigned.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'staff'
  AND p.slug IN ('dashboard', 'pos', 'orders')
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id
  )
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- Menu tables (created here first, so the upgrades below also work on a new database)
-- ---------------------------------------------------------------------------

-- ============ categories (Coffee, Tea, Smoothie...) ============
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        JSONB NOT NULL,                       -- {"en":"Coffee","km":"កាហ្វេ","zh":"咖啡","lo":"..","ja":"..","vi":".."}
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  img         TEXT NOT NULL DEFAULT '',
  thumbnail   TEXT NOT NULL DEFAULT '',
  status      SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),  -- 1 = Active, 0 = Inactive
  sort_num    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

-- ============ drinks_type (Hot, Iced, Blended...) ============
CREATE TABLE IF NOT EXISTS drinks_type (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        JSONB NOT NULL,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  img         TEXT NOT NULL DEFAULT '',
  thumbnail   TEXT NOT NULL DEFAULT '',
  status      SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drinks_type_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

-- ============ products (the menu items you sell) ============
-- NOT called order_items: that name is better kept for the lines inside a customer's order
CREATE TABLE IF NOT EXISTS products (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             JSONB NOT NULL,
  description      JSONB NOT NULL DEFAULT '{}'::jsonb,
  img              TEXT NOT NULL DEFAULT '',
  thumbnail        TEXT NOT NULL DEFAULT '',
  price            NUMERIC(10,2) CHECK (price >= 0),            -- standard price, NULL = sizes only
  big_size_price   NUMERIC(10,2) CHECK (big_size_price >= 0),   -- NULL = size not offered
  small_size_price NUMERIC(10,2) CHECK (small_size_price >= 0), -- NULL = size not offered
  category_id      INTEGER NOT NULL REFERENCES categories(id)  ON DELETE RESTRICT,
  type_id          INTEGER          REFERENCES drinks_type(id) ON DELETE SET NULL,
  status           SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id, sort_num);
CREATE INDEX IF NOT EXISTS products_type_idx     ON products (type_id);

-- Existing products table: add columns required by the new frontend/backend
ALTER TABLE products ALTER COLUMN price DROP NOT NULL;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_has_a_price;
ALTER TABLE products ADD CONSTRAINT products_has_a_price
  CHECK (price IS NOT NULL OR big_size_price IS NOT NULL OR small_size_price IS NOT NULL);
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_discount_range;
ALTER TABLE products ADD CONSTRAINT products_discount_range
  CHECK (discount_percent BETWEEN 0 AND 100);
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tax_range;
ALTER TABLE products ADD CONSTRAINT products_tax_range
  CHECK (tax_percent IS NULL OR tax_percent BETWEEN 0 AND 100);

-- ============ hero_slides (homepage slider) ============
CREATE TABLE IF NOT EXISTS hero_slides (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- badge, e.g. {"en":"Fresh Bakery"}
  title      JSONB NOT NULL,
  text       JSONB NOT NULL DEFAULT '{}'::jsonb,
  img        TEXT NOT NULL DEFAULT '',
  thumbnail  TEXT NOT NULL DEFAULT '',
  cta        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- button label
  link       TEXT NOT NULL DEFAULT '',
  status     SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),  -- 1 = shown, 0 = hidden
  sort_num   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hero_slides_title_has_en CHECK (title ? 'en' AND length(title->>'en') > 0)
);

CREATE INDEX IF NOT EXISTS hero_slides_sort_idx ON hero_slides (sort_num, id);

-- ============ maps (maps in index page) ============
CREATE TABLE IF NOT EXISTS maps (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtitle    JSONB NOT NULL DEFAULT '{}'::jsonb,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  img         TEXT NOT NULL DEFAULT '',
  thumbnail   TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  slogan      JSONB NOT NULL DEFAULT '{}'::jsonb,
  map         TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  status      SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS maps_updated_at ON maps;

CREATE TRIGGER maps_updated_at
BEFORE UPDATE ON maps
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Levels (option groups, sugar, ice, coffee)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS levels_options (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name JSONB NOT NULL DEFAULT '{}'::jsonb,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  array_categories INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sugar_level (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name JSONB NOT NULL DEFAULT '{}'::jsonb,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ice_level (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name JSONB NOT NULL DEFAULT '{}'::jsonb,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  array_categories INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coffee_level (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  array_categories INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE levels_options ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '';
ALTER TABLE levels_options ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE sugar_level ADD COLUMN IF NOT EXISTS levels_options_id INTEGER;
ALTER TABLE ice_level ADD COLUMN IF NOT EXISTS levels_options_id INTEGER;
ALTER TABLE coffee_level ADD COLUMN IF NOT EXISTS levels_options_id INTEGER;
ALTER TABLE sugar_level ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '';
ALTER TABLE sugar_level ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE ice_level ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '';
ALTER TABLE ice_level ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE coffee_level ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '';
ALTER TABLE coffee_level ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sugar_level_levels_options_id_fkey' AND conrelid = 'sugar_level'::regclass) THEN
    ALTER TABLE sugar_level ADD CONSTRAINT sugar_level_levels_options_id_fkey
      FOREIGN KEY (levels_options_id) REFERENCES levels_options(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ice_level_levels_options_id_fkey' AND conrelid = 'ice_level'::regclass) THEN
    ALTER TABLE ice_level ADD CONSTRAINT ice_level_levels_options_id_fkey
      FOREIGN KEY (levels_options_id) REFERENCES levels_options(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coffee_level_levels_options_id_fkey' AND conrelid = 'coffee_level'::regclass) THEN
    ALTER TABLE coffee_level ADD CONSTRAINT coffee_level_levels_options_id_fkey
      FOREIGN KEY (levels_options_id) REFERENCES levels_options(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS levels_options_status_sort_idx ON levels_options (status, sort_num);
CREATE INDEX IF NOT EXISTS sugar_level_status_sort_idx ON sugar_level (status, sort_num);
CREATE INDEX IF NOT EXISTS ice_level_status_sort_idx ON ice_level (status, sort_num);
CREATE INDEX IF NOT EXISTS coffee_level_status_sort_idx ON coffee_level (status, sort_num);
CREATE INDEX IF NOT EXISTS sugar_level_levels_options_idx ON sugar_level (levels_options_id);
CREATE INDEX IF NOT EXISTS ice_level_levels_options_idx ON ice_level (levels_options_id);
CREATE INDEX IF NOT EXISTS coffee_level_levels_options_idx ON coffee_level (levels_options_id);
CREATE INDEX IF NOT EXISTS levels_options_categories_gin_idx ON levels_options USING GIN (array_categories);
CREATE INDEX IF NOT EXISTS levels_options_drinkstypes_gin_idx ON levels_options USING GIN (array_drinkstypes);
CREATE INDEX IF NOT EXISTS ice_level_categories_gin_idx ON ice_level USING GIN (array_categories);
CREATE INDEX IF NOT EXISTS ice_level_drinkstypes_gin_idx ON ice_level USING GIN (array_drinkstypes);
CREATE INDEX IF NOT EXISTS coffee_level_categories_gin_idx ON coffee_level USING GIN (array_categories);
CREATE INDEX IF NOT EXISTS coffee_level_drinkstypes_gin_idx ON coffee_level USING GIN (array_drinkstypes);

-- ---------------------------------------------------------------------------
-- Currencies, exchange rates and country flag columns added by newer schema versions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS currencies (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name JSONB NOT NULL DEFAULT '{}'::jsonb,           -- {"en":"Cambodian Riel","km":"រៀល"}
  currency_symbol TEXT DEFAULT NULL,                 -- e.g. "៛", "$"
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  country_flags_id INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),  -- 1 = active, 0 = hidden
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT currencies_name_has_en
    CHECK (name ? 'en' AND length(name->>'en') > 0)
);

CREATE INDEX IF NOT EXISTS currencies_status_sort_idx ON currencies (status, sort_num);
CREATE INDEX IF NOT EXISTS currencies_country_flags_idx ON currencies (country_flags_id);

ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS native_name TEXT NOT NULL DEFAULT '';
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '';
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '';
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS svg TEXT NOT NULL DEFAULT '';

-- A country_flags table that already existed may still have NULLs / nullable columns
-- (the old route stored NULL for "no file"): bring it in line with the code, which stores ''.
UPDATE country_flags SET native_name = '' WHERE native_name IS NULL;
UPDATE country_flags SET img         = '' WHERE img         IS NULL;
UPDATE country_flags SET thumbnail   = '' WHERE thumbnail   IS NULL;
UPDATE country_flags SET icon        = '' WHERE icon        IS NULL;
UPDATE country_flags SET svg         = '' WHERE svg         IS NULL;
ALTER TABLE country_flags
  ALTER COLUMN native_name SET DEFAULT '', ALTER COLUMN native_name SET NOT NULL,
  ALTER COLUMN img         SET DEFAULT '', ALTER COLUMN img         SET NOT NULL,
  ALTER COLUMN thumbnail   SET DEFAULT '', ALTER COLUMN thumbnail   SET NOT NULL,
  ALTER COLUMN icon        SET DEFAULT '', ALTER COLUMN icon        SET NOT NULL,
  ALTER COLUMN svg         SET DEFAULT '', ALTER COLUMN svg         SET NOT NULL;

ALTER TABLE currencies ADD COLUMN IF NOT EXISTS currency_symbol TEXT;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS description JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS country_flags_id INTEGER REFERENCES country_flags(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS exchange_rate (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  currencies_id INTEGER NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  value NUMERIC(15,6) NOT NULL DEFAULT 0,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  country_flags_id INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS currencies_id INTEGER;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS value NUMERIC(15,6) NOT NULL DEFAULT 0;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS description JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS country_flags_id INTEGER;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS status SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS sort_num INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- "Name must have an English text" rules for tables that already existed
-- without them. NOT VALID = the rule applies to new/changed rows only, so old
-- rows that break it cannot make this script fail.
-- ---------------------------------------------------------------------------

DO $do$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('roles',       'roles_title_has_en',       $$role_title ? 'en' AND length(role_title->>'en') > 0$$),
      ('permissions', 'permissions_name_has_en',  $$name ? 'en' AND length(name->>'en') > 0$$),
      ('currencies',  'currencies_name_has_en',   $$name ? 'en' AND length(name->>'en') > 0$$),
      ('categories',  'categories_name_has_en',   $$name ? 'en' AND length(name->>'en') > 0$$),
      ('drinks_type', 'drinks_type_name_has_en',  $$name ? 'en' AND length(name->>'en') > 0$$)
    ) AS v(tbl, cname, expr)
  LOOP
    IF to_regclass(c.tbl) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = c.cname AND conrelid = to_regclass(c.tbl)
       ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
        c.tbl, c.cname, c.expr
      );
    END IF;
  END LOOP;
END $do$;

-- ---------------------------------------------------------------------------
-- Recreate update triggers (drop first so the script can be rerun)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'country_flags', 'genders', 'roles', 'positions', 'permissions', 'role_permissions'
    'nationalities', 'users', 'categories', 'drinks_type', 'products',
    'hero_slides', 'maps', 'levels_options', 'sugar_level', 'ice_level',
    'coffee_level', 'currencies', 'exchange_rate'
  ]
  LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
      EXECUTE format(
        'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

COMMIT;


-- =========================================================
-- EMAIL OTP
-- Supports password reset and email verification
-- PostgreSQL
-- =========================================================

CREATE TABLE IF NOT EXISTS email_otp (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- User requesting the OTP
  user_id INTEGER NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  -- Purpose of this OTP
  purpose TEXT NOT NULL DEFAULT 'password_reset'
    CHECK (
      purpose IN (
        'password_reset',
        'email_verification',
        'email_change'
      )
    ),

  -- Store a secure hash of the OTP, never the plaintext OTP
  otp_hash TEXT NOT NULL,

  -- Email address the OTP was sent to
  email TEXT NOT NULL,

  -- Lifecycle status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'verified',
        'used',
        'expired',
        'revoked',
        'locked'
      )
    ),

  -- Email delivery tracking
  sent_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      delivery_status IN (
        'pending',
        'sent',
        'failed'
      )
    ),
  delivery_error TEXT,

  -- OTP validity
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Verification attempt limits
  attempts INTEGER NOT NULL DEFAULT 0
    CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5
    CHECK (max_attempts > 0),

  -- Resend tracking
  resend_count INTEGER NOT NULL DEFAULT 0
    CHECK (resend_count >= 0),
  last_resend_at TIMESTAMPTZ,
  resend_available_at TIMESTAMPTZ,

  -- Optional request context
  request_ip INET,
  request_user_agent TEXT,

  -- Optional browser location, only with user permission
  request_latitude DOUBLE PRECISION
    CHECK (
      request_latitude IS NULL
      OR request_latitude BETWEEN -90 AND 90
    ),
  request_longitude DOUBLE PRECISION
    CHECK (
      request_longitude IS NULL
      OR request_longitude BETWEEN -180 AND 180
    ),
  request_location_accuracy_m DOUBLE PRECISION
    CHECK (
      request_location_accuracy_m IS NULL
      OR request_location_accuracy_m >= 0
    ),
  request_location_captured_at TIMESTAMPTZ,
  request_location_consent BOOLEAN NOT NULL DEFAULT FALSE,

  -- Optional verification context
  verification_ip INET,
  verification_user_agent TEXT,

  verification_latitude DOUBLE PRECISION
    CHECK (
      verification_latitude IS NULL
      OR verification_latitude BETWEEN -90 AND 90
    ),
  verification_longitude DOUBLE PRECISION
    CHECK (
      verification_longitude IS NULL
      OR verification_longitude BETWEEN -180 AND 180
    ),
  verification_location_accuracy_m DOUBLE PRECISION
    CHECK (
      verification_location_accuracy_m IS NULL
      OR verification_location_accuracy_m >= 0
    ),
  verification_location_captured_at TIMESTAMPTZ,
  verification_location_consent BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE email_otp
  DROP CONSTRAINT IF EXISTS email_otp_purpose_check;

ALTER TABLE email_otp
  ADD CONSTRAINT email_otp_purpose_check
  CHECK (
    purpose IN (
      'password_reset',
      'email_verification',
      'email_change',
      'password_change'
    )
  );

-- Look up recent OTPs for a user and purpose
CREATE INDEX IF NOT EXISTS idx_email_otp_user_purpose_created
  ON email_otp (user_id, purpose, created_at DESC);

-- Find expired records for cleanup
CREATE INDEX IF NOT EXISTS idx_email_otp_expires_at
  ON email_otp (expires_at);

-- Look up records by email address
CREATE INDEX IF NOT EXISTS idx_email_otp_email_created
  ON email_otp (email, created_at DESC);

-- Find pending OTPs efficiently
CREATE INDEX IF NOT EXISTS idx_email_otp_pending
  ON email_otp (user_id, purpose, expires_at)
  WHERE status = 'pending';

-- =========================================================
-- EMAIL OTP SECURITY EVENTS
-- Records multiple requests, verification failures,
-- successes, and password-reset completion events.
-- =========================================================

CREATE TABLE IF NOT EXISTS email_otp_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Keep the audit event if the OTP record is deleted
  email_otp_id INTEGER
    REFERENCES email_otp(id) ON DELETE SET NULL,

  -- Keep the event if the user is deleted
  user_id INTEGER
    REFERENCES users(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL
    CHECK (
      event_type IN (
        'requested',
        'email_sent',
        'email_failed',
        'resend_requested',
        'verification_failed',
        'verification_succeeded',
        'otp_expired',
        'otp_locked',
        'otp_revoked',
        'reset_started',
        'reset_completed',
        'reset_failed'
      )
    ),

  event_details JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Network and browser context
  ip_address INET,
  user_agent TEXT,

  -- Optional GPS location, only when consent is given
  latitude DOUBLE PRECISION
    CHECK (
      latitude IS NULL
      OR latitude BETWEEN -90 AND 90
    ),
  longitude DOUBLE PRECISION
    CHECK (
      longitude IS NULL
      OR longitude BETWEEN -180 AND 180
    ),
  location_accuracy_m DOUBLE PRECISION
    CHECK (
      location_accuracy_m IS NULL
      OR location_accuracy_m >= 0
    ),
  location_captured_at TIMESTAMPTZ,
  location_consent BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_events_user_created
  ON email_otp_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_otp_events_otp_created
  ON email_otp_events (email_otp_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_otp_events_type_created
  ON email_otp_events (event_type, created_at DESC);

DROP TRIGGER IF EXISTS email_otp_updated_at ON email_otp;
CREATE TRIGGER email_otp_updated_at BEFORE UPDATE ON email_otp FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =========================================================
-- Current verification status for each user.
-- OTP codes and OTP event history remain in their existing tables.
-- =========================================================

-- Email verification migration. Run ONCE, after backing up the database.
-- It is safe to run again, EXCEPT the "grandfather" step marks users that have no
-- verification row yet as verified, so do not re-run it after new unverified users exist.
-- Requires: users, email_otp, email_otp_events and set_updated_at() already exist
-- (they are created by schema.sql).

BEGIN;

-- -- 1. The table (created here if it does not exist yet)
-- CREATE TABLE IF NOT EXISTS user_verifications (
--   user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

--   -- Email verification
--   is_verified_email BOOLEAN NOT NULL DEFAULT FALSE,
--   email_verified_at TIMESTAMPTZ NULL,
--   email_updated_at TIMESTAMPTZ NULL,

--   -- Reserved for future phone verification
--   is_verified_phone BOOLEAN NOT NULL DEFAULT FALSE,
--   phone_verified_at TIMESTAMPTZ NULL,
--   phone_updated_at TIMESTAMPTZ NULL
-- );
-- 1 + 3. Create the table and mark the EXISTING users as verified, only the first time (when the table does not exist yet)
DO $$
BEGIN
  IF to_regclass('user_verifications') IS NULL THEN
    CREATE TABLE user_verifications (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      is_verified_email BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified_at TIMESTAMPTZ NULL,
      email_updated_at TIMESTAMPTZ NULL,
      is_verified_phone BOOLEAN NOT NULL DEFAULT FALSE,
      phone_verified_at TIMESTAMPTZ NULL,
      phone_updated_at TIMESTAMPTZ NULL
    );
    INSERT INTO user_verifications (user_id, is_verified_email, email_verified_at, email_updated_at)
    SELECT id, TRUE, now(), now() FROM users;
  END IF;
END $$;

-- -- 2. New columns + updated_at trigger
-- ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- DROP TRIGGER IF EXISTS user_verifications_updated_at ON user_verifications;
-- CREATE TRIGGER user_verifications_updated_at
--   BEFORE UPDATE ON user_verifications
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CREATE INDEX IF NOT EXISTS user_verifications_verified_idx ON user_verifications (is_verified_email);
-- 2. New columns + updated_at trigger (unchanged: safe to repeat)
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS user_verifications_updated_at ON user_verifications;
CREATE TRIGGER user_verifications_updated_at
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS user_verifications_verified_idx ON user_verifications (is_verified_email);


-- 3. Grandfather: every existing user counts as verified (so nobody is locked out of password reset)
INSERT INTO user_verifications (user_id, is_verified_email, email_verified_at, email_updated_at)
SELECT id, TRUE, now(), now() FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 4. Two new event types for the audit log
ALTER TABLE email_otp_events DROP CONSTRAINT IF EXISTS email_otp_events_event_type_check;
ALTER TABLE email_otp_events ADD CONSTRAINT email_otp_events_event_type_check CHECK (
  event_type IN (
    'requested', 'email_sent', 'email_failed', 'resend_requested',
    'verification_failed', 'verification_succeeded', 'otp_expired', 'otp_locked', 'otp_revoked',
    'reset_started', 'reset_completed', 'reset_failed',
    'email_verified', 'admin_marked_verified'
  )
);

COMMIT;

-- ======================================================================
-- ======================================================================
-- ======================================================================
-- ======================================================================
-- ======================================================================

-- =========================================================
-- ORDERS (POS + online)
-- Money columns use the currency of products.price (store_settings.currency_code)
-- =========================================================

BEGIN;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

-- ONE row: shop-wide order rules
CREATE TABLE IF NOT EXISTS store_settings (
  id                         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  currency_code              TEXT NOT NULL DEFAULT 'KHR',      -- 'USD' if your menu prices are dollars
  default_tax_percent        NUMERIC(5,2) NOT NULL DEFAULT 0  CHECK (default_tax_percent BETWEEN 0 AND 100),
  max_staff_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (max_staff_discount_percent BETWEEN 0 AND 100),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_options (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,                             -- 'standard' | 'express' | 'freight'
  name       JSONB NOT NULL,
  fee        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  status     SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT delivery_options_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE CHECK (code = upper(code)),  -- always stored in capitals
  percent    NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100),
  status     SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number     TEXT NOT NULL UNIQUE DEFAULT ('CKM-' || nextval('order_number_seq')),
  source           TEXT NOT NULL DEFAULT 'pos'     CHECK (source IN ('pos', 'online')),
  order_type       TEXT NOT NULL DEFAULT 'dine-in' CHECK (order_type IN ('dine-in', 'pickup', 'delivery')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'  CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  customer_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- the signed-in customer (NULL = walk-in / guest)
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- the cashier who took a POS order
  customer_name    TEXT NOT NULL DEFAULT '',                          -- copies: receipts keep printing if the account is deleted
  customer_phone   TEXT NOT NULL DEFAULT '',
  customer_address TEXT NOT NULL DEFAULT '',
  table_no         TEXT NOT NULL DEFAULT '',
  note             TEXT NOT NULL DEFAULT '',
  currency_code    TEXT NOT NULL DEFAULT 'KHR',
  subtotal         NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),      -- before the order discount
  discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  promo_code       TEXT NOT NULL DEFAULT '',
  delivery_code    TEXT NOT NULL DEFAULT '',
  shipping         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  tax              NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total            NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ
);
-- what the customer chose at the online checkout (staff take the payment in Orders)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_preference TEXT NOT NULL DEFAULT ''
  CHECK (payment_preference IN ('', 'cash', 'card', 'qr'));

-- the lines of an order. Names and prices are COPIES, so old orders never change when the menu does
CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name     JSONB NOT NULL,                                    -- {"en":"Iced Latte","km":"..."}
  size_key         TEXT NOT NULL DEFAULT 'price' CHECK (size_key IN ('price', 'big', 'small')),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  base_price       NUMERIC(12,2) NOT NULL,                            -- size price before the product discount
  discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 0,
  extra_price      NUMERIC(12,2) NOT NULL DEFAULT 0,                  -- coffee-level extra (already inside unit_price)
  unit_price       NUMERIC(12,2) NOT NULL,                            -- after the product discount + extra
  tax_percent      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  line_subtotal    NUMERIC(12,2) NOT NULL,                            -- unit_price x quantity
  line_tax         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sugar_level_id   INTEGER REFERENCES sugar_level(id)  ON DELETE SET NULL,
  ice_level_id     INTEGER REFERENCES ice_level(id)    ON DELETE SET NULL,
  coffee_level_id  INTEGER REFERENCES coffee_level(id) ON DELETE SET NULL,
  options          JSONB NOT NULL DEFAULT '{}'::jsonb,                -- names: {"size":"Big","sugar":{"en":"50%"},...}
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method        TEXT NOT NULL CHECK (method IN ('cash', 'card', 'qr', 'other')),
  amount        NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  cash_received NUMERIC(12,2),
  change_given  NUMERIC(12,2),
  reference     TEXT NOT NULL DEFAULT '',                             -- card / KHQR transaction id
  status        TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded', 'failed')),
  received_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If an OLD table with the same name is in the way, stop with a clear message (see "Step 0")
DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(t.tbl, ', ') INTO bad
    FROM (VALUES
      ('orders', 'customer_id'), ('order_items', 'size_key'), ('payments', 'received_by'),
      ('delivery_options', 'sort_num'), ('promo_codes', 'starts_at'), ('store_settings', 'default_tax_percent')
    ) AS t(tbl, col)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = current_schema() AND c.table_name = t.tbl AND c.column_name = t.col
   );
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Old-shaped table(s) in the way: %. Run "Step 0" (drop the old order tables), then run db:setup again.', bad;
  END IF;
END $$;

-- starting data (a re-run never overwrites what you changed)
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_options (code, name, fee, sort_num) VALUES   -- fees in the menu currency: edit to your real prices
  ('standard', '{"en":"Standard"}',          0,     1),
  ('express',  '{"en":"Local Delivery"}',    14350, 2),
  ('freight',  '{"en":"Catering Delivery"}', 32800, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO promo_codes (code, percent) VALUES ('BLOSSOM10', 10) ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS orders_created_idx    ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_source_idx     ON orders (source, status);
CREATE INDEX IF NOT EXISTS orders_customer_idx   ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_created_by_idx ON orders (created_by);
CREATE INDEX IF NOT EXISTS order_items_order_idx   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);
CREATE INDEX IF NOT EXISTS payments_order_idx    ON payments (order_id);

DROP TRIGGER IF EXISTS store_settings_updated_at   ON store_settings;
DROP TRIGGER IF EXISTS delivery_options_updated_at ON delivery_options;
DROP TRIGGER IF EXISTS promo_codes_updated_at      ON promo_codes;
DROP TRIGGER IF EXISTS orders_updated_at           ON orders;
CREATE TRIGGER store_settings_updated_at   BEFORE UPDATE ON store_settings   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER delivery_options_updated_at BEFORE UPDATE ON delivery_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER promo_codes_updated_at      BEFORE UPDATE ON promo_codes      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at           BEFORE UPDATE ON orders           FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- UPDATE store_settings SET default_tax_percent = 8;   -- your rate. A product with its own Tax % ignores this




-- ====================================================================
-- ======================== Impersonation Logs ========================
-- ====================================================================

CREATE TABLE IF NOT EXISTS impersonation_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT NOT NULL REFERENCES users(id),
    target_user_id BIGINT NOT NULL REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    end_reason VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_admin
    ON impersonation_logs(admin_user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_target
    ON impersonation_logs(target_user_id, started_at DESC);