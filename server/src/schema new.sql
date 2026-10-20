-- ============ shared helper: auto-update updated_at ============
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============ country_flags (must come BEFORE nationalities / currencies) ============
CREATE TABLE IF NOT EXISTS country_flags (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        JSONB NOT NULL,                              -- {"en":"Cambodia","km":"កម្ពុជា"}
  native_name TEXT NOT NULL DEFAULT '',
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  img         TEXT NOT NULL DEFAULT '',                    -- raster image  (1 upload -> img + thumbnail)
  thumbnail   TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '',                    -- emoji, e.g. 🇰🇭
  svg         TEXT NOT NULL DEFAULT '',                    -- independent SVG upload
  status      SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT country_flags_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS native_name TEXT;
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS img         TEXT;
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS thumbnail   TEXT;
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS icon        TEXT;
ALTER TABLE country_flags ADD COLUMN IF NOT EXISTS svg         TEXT;
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

DROP TRIGGER IF EXISTS country_flags_updated_at ON country_flags;
CREATE TRIGGER country_flags_updated_at BEFORE UPDATE ON country_flags FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ genders ============
CREATE TABLE IF NOT EXISTS genders (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gender      JSONB NOT NULL,
  sc_gender   JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_num    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS genders_updated_at ON genders;
CREATE TRIGGER genders_updated_at BEFORE UPDATE ON genders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ roles ============
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    role_title JSONB NOT NULL DEFAULT '{}'::jsonb,
    description JSONB NOT NULL DEFAULT '{}'::jsonb,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
    sort_num INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    CONSTRAINT roles_title_has_en CHECK (role_title ? 'en' AND length(role_title->>'en') > 0)
);

ALTER TABLE roles ADD COLUMN IF NOT EXISTS code TEXT;
-- if you already created "Admin" / "Staff" / "Customer" by hand, give them their code
UPDATE roles SET code = lower(role_title->>'en')
 WHERE code IS NULL AND lower(role_title->>'en') IN ('admin', 'staff', 'customer');
CREATE UNIQUE INDEX IF NOT EXISTS roles_code_idx ON roles (code);
CREATE INDEX IF NOT EXISTS roles_status_sort_idx ON roles (status, sort_num);

DROP TRIGGER IF EXISTS roles_updated_at ON roles;
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO roles (code, role_title, description, sort_num) VALUES
  ('admin',    '{"en":"Admin"}',    '{"en":"Full access to everything."}', 1),
  ('staff',    '{"en":"Staff"}',    '{"en":"Cafe team. Sees only the menus you allow."}', 2),
  ('customer', '{"en":"Customer"}', '{"en":"Regular website user. No dashboard access."}', 3)
ON CONFLICT (code) DO NOTHING;

-- ============ positions ============
CREATE TABLE IF NOT EXISTS positions (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  position_title  JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"en": ["Shop Owner", "Business Owner"], "km": ["ម្ចាស់ហាង", "ម្ចាស់អាជីវកម្ម"]}
  description     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)), -- 1 = active, 0 = hidden
  sort_num        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT positions_title_has_en CHECK (position_title ? 'en' AND jsonb_array_length(position_title->'en') > 0)
);

CREATE INDEX IF NOT EXISTS positions_status_sort_idx ON positions (status, sort_num);

DROP TRIGGER IF EXISTS positions_updated_at ON positions;
CREATE TRIGGER positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ permissions ============
CREATE TABLE IF NOT EXISTS permissions (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         JSONB NOT NULL DEFAULT '{}'::jsonb,
  slug         TEXT NOT NULL UNIQUE DEFAULT '',    -- the key the app checks, e.g. "menu", "users"
  module       TEXT NOT NULL DEFAULT 'general',
  description  JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_num     INTEGER NOT NULL DEFAULT 0,
  status       SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT permissions_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

ALTER TABLE permissions ADD COLUMN IF NOT EXISTS admin_only BOOLEAN NOT NULL DEFAULT false; -- true = can never be given to non-admins

CREATE INDEX IF NOT EXISTS permissions_status_sort_idx ON permissions (status, sort_num);
CREATE INDEX IF NOT EXISTS permissions_slug_idx ON permissions (slug);

DROP TRIGGER IF EXISTS permissions_updated_at ON permissions;
CREATE TRIGGER permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- the slugs match the keys the dashboard already uses
INSERT INTO permissions (slug, module, name, description, sort_num, admin_only) VALUES
  ('dashboard', 'dashboard', '{"en":"Dashboard"}',            '{"en":"Sales overview and stats"}', 1, false),
  ('pos',       'orders',    '{"en":"POS"}',                  '{"en":"Take and charge orders at the counter"}', 2, false),
  ('orders',    'orders',    '{"en":"Orders"}',               '{"en":"View orders and change their status"}', 3, false),
  ('menu',      'menu',      '{"en":"Menu Manager"}',         '{"en":"Add, edit and hide menu items"}', 4, false),
  ('reports',   'reports',   '{"en":"Reports"}',              '{"en":"Sales reports and CSV export"}', 5, false),
  ('pages',     'pages',     '{"en":"Pages & Hero"}',         '{"en":"Edit website content"}', 6, false),
  ('users',     'users',     '{"en":"Users"}',                '{"en":"Manage customers (admins manage everyone)"}', 7, false),
  ('roles',     'users',     '{"en":"Roles & Permissions"}',  '{"en":"Change who can open what"}', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- ============ nationalities ============
CREATE TABLE IF NOT EXISTS nationalities (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nationality        JSONB NOT NULL,
  nation_code        TEXT NOT NULL DEFAULT '',
  country_flags_id   INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status             SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)), -- 0 = active, 1 = not active  (the opposite of the other tables!)
  sort_num           INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nationalities_name_has_en CHECK (nationality ? 'en' AND length(nationality->>'en') > 0)
);

CREATE INDEX IF NOT EXISTS nationalities_status_sort_idx ON nationalities (status, sort_num);
CREATE INDEX IF NOT EXISTS nationalities_country_flags_idx ON nationalities (country_flags_id);

DROP TRIGGER IF EXISTS nationalities_updated_at ON nationalities;
CREATE TRIGGER nationalities_updated_at BEFORE UPDATE ON nationalities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ users ============
-- status      1 = active, 0 = not active / hidden
-- is_blocked  1 = blocked, 0 = not blocked
-- is_removed  1 = removed (email/phone get the "Removed-" prefix), 0 = not removed.  DELETE = the row is really gone
CREATE TABLE IF NOT EXISTS users (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL DEFAULT '',
  first_name_native TEXT NOT NULL DEFAULT '',
  last_name_native  TEXT NOT NULL DEFAULT '',
  gender_id         INTEGER REFERENCES genders(id)       ON DELETE SET NULL,
  nationality_id    INTEGER REFERENCES nationalities(id) ON DELETE SET NULL,
  address           TEXT NOT NULL DEFAULT '',
  region            TEXT NOT NULL DEFAULT '',
  country           TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL,
  phone             TEXT NOT NULL DEFAULT '',
  password_hash     TEXT NOT NULL,
  role_id           INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  position_id       INTEGER REFERENCES positions(id)   ON DELETE SET NULL,
  permission_id     INTEGER REFERENCES permissions(id) ON DELETE SET NULL,  -- ONE extra permission on top of the role's
  status            SMALLINT NOT NULL DEFAULT 1,
  is_blocked        SMALLINT NOT NULL DEFAULT 0,
  is_removed        SMALLINT NOT NULL DEFAULT 0,
  avatar            TEXT NOT NULL DEFAULT '',     -- /api/uploads/avatars/img/<id>.webp
  avatar_thumbnail  TEXT NOT NULL DEFAULT '',     -- /api/uploads/avatars/thumbnails/<id>.webp
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at        TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ
);

-- ----- users: upgrade an OLD users table to the new shape (safe to re-run) -----
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name_native TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name_native  TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender_id         INTEGER REFERENCES genders(id)       ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality_id    INTEGER REFERENCES nationalities(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address           TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS region            TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country           TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS description       TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id           INTEGER REFERENCES roles(id)       ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position_id       INTEGER REFERENCES positions(id)   ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_id     INTEGER REFERENCES permissions(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked        SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_removed        SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_thumbnail  TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS removed_at        TIMESTAMPTZ;

-- old text column "role" -> role_id, then the old column is dropped
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'role') THEN
    UPDATE users u SET role_id = r.id FROM roles r WHERE u.role_id IS NULL AND r.code = u.role;
    UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'customer') WHERE role_id IS NULL;
    ALTER TABLE users DROP COLUMN role;
  END IF;
END $$;
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

-- old text status ('active' / 'blocked') -> status 1/0 + is_blocked
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'status')
     IN ('text', 'character varying') THEN
    UPDATE users SET is_blocked = 1 WHERE status = 'blocked';
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
    ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN status TYPE SMALLINT USING (CASE WHEN status IN ('active', 'blocked') THEN 1 ELSE 0 END);
    ALTER TABLE users ALTER COLUMN status SET DEFAULT 1;
  END IF;
END $$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_chk;
ALTER TABLE users ADD  CONSTRAINT users_status_chk     CHECK (status     IN (0, 1));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_is_blocked_chk;
ALTER TABLE users ADD  CONSTRAINT users_is_blocked_chk CHECK (is_blocked IN (0, 1));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_is_removed_chk;
ALTER TABLE users ADD  CONSTRAINT users_is_removed_chk CHECK (is_removed IN (0, 1));

-- emails are unique (any upper/lower case) among users that are NOT removed
DROP INDEX IF EXISTS users_email_lower_idx;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_idx ON users (lower(email)) WHERE is_removed = 0;
CREATE INDEX IF NOT EXISTS users_role_idx  ON users (role_id);
CREATE INDEX IF NOT EXISTS users_flags_idx ON users (is_removed, is_blocked, status);

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ role_permissions (role_id + permission_id) ============
-- the OLD table (role TEXT, permission TEXT) is migrated and then dropped
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = 'role_permissions' AND column_name = 'role') THEN
    ALTER TABLE role_permissions RENAME TO role_permissions_old;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_rp_pkey PRIMARY KEY (role_id, permission_id)
);

DO $$
BEGIN
  IF to_regclass('role_permissions_old') IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
      FROM role_permissions_old o
      JOIN roles r ON r.code = o.role
      JOIN permissions p ON p.slug = o.permission
    ON CONFLICT DO NOTHING;
    DROP TABLE role_permissions_old;
  END IF;
END $$;

-- default staff permissions, only while staff has none yet
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
 WHERE r.code = 'staff' AND p.slug IN ('dashboard', 'pos', 'orders')
   AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id)
ON CONFLICT DO NOTHING;

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
CREATE TRIGGER maps_updated_at BEFORE UPDATE ON maps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ levels_options (option-group configuration) ============
CREATE TABLE IF NOT EXISTS levels_options (
  id                 INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name               JSONB NOT NULL DEFAULT '{}'::jsonb,
  description        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num           INTEGER NOT NULL DEFAULT 0,
  array_categories   INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes  INTEGER[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ sugar_level ============
CREATE TABLE IF NOT EXISTS sugar_level (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL,
  name              JSONB NOT NULL DEFAULT '{}'::jsonb,
  description       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num          INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ice_level ============
CREATE TABLE IF NOT EXISTS ice_level (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL,
  name              JSONB NOT NULL DEFAULT '{}'::jsonb,
  description       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num          INTEGER NOT NULL DEFAULT 0,
  array_categories  INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes INTEGER[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ coffee_level ============
CREATE TABLE IF NOT EXISTS coffee_level (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL,
  name              JSONB NOT NULL DEFAULT '{}'::jsonb,
  price             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num          INTEGER NOT NULL DEFAULT 0,
  array_categories  INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes INTEGER[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS levels_options_status_sort_idx ON levels_options (status, sort_num);
CREATE INDEX IF NOT EXISTS sugar_level_status_sort_idx    ON sugar_level (status, sort_num);
CREATE INDEX IF NOT EXISTS ice_level_status_sort_idx      ON ice_level (status, sort_num);
CREATE INDEX IF NOT EXISTS coffee_level_status_sort_idx   ON coffee_level (status, sort_num);
CREATE INDEX IF NOT EXISTS levels_options_categories_gin_idx  ON levels_options USING GIN (array_categories);
CREATE INDEX IF NOT EXISTS levels_options_drinkstypes_gin_idx ON levels_options USING GIN (array_drinkstypes);
CREATE INDEX IF NOT EXISTS ice_level_categories_gin_idx       ON ice_level USING GIN (array_categories);
CREATE INDEX IF NOT EXISTS ice_level_drinkstypes_gin_idx      ON ice_level USING GIN (array_drinkstypes);
CREATE INDEX IF NOT EXISTS coffee_level_categories_gin_idx    ON coffee_level USING GIN (array_categories);
CREATE INDEX IF NOT EXISTS coffee_level_drinkstypes_gin_idx   ON coffee_level USING GIN (array_drinkstypes);

-- ============ currencies ============
CREATE TABLE IF NOT EXISTS currencies (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             JSONB NOT NULL DEFAULT '{}'::jsonb,        -- {"en":"Cambodian Riel","km":"រៀល"}
  currency_symbol  TEXT DEFAULT NULL,                         -- e.g. "៛", "$"
  description      JSONB NOT NULL DEFAULT '{}'::jsonb,
  country_flags_id INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status           SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)), -- 1 = active, 0 = hidden
  sort_num         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT currencies_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

CREATE INDEX IF NOT EXISTS currencies_status_sort_idx ON currencies (status, sort_num);
CREATE INDEX IF NOT EXISTS currencies_country_flags_idx ON currencies (country_flags_id);

DROP TRIGGER IF EXISTS currencies_updated_at ON currencies;
CREATE TRIGGER currencies_updated_at BEFORE UPDATE ON currencies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ exchange_rate ============
CREATE TABLE IF NOT EXISTS exchange_rate (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  currencies_id     INTEGER NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  value             NUMERIC(15, 6) NOT NULL DEFAULT 0,
  description       JSONB NOT NULL DEFAULT '{}'::jsonb,
  country_flags_id  INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status            SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num          INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS currencies_id INTEGER;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS value NUMERIC(15, 6);
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS description JSONB;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS country_flags_id INTEGER;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS status SMALLINT;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS sort_num INTEGER;

DROP TRIGGER IF EXISTS exchange_rate_updated_at ON exchange_rate;
CREATE TRIGGER exchange_rate_updated_at BEFORE UPDATE ON exchange_rate FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ updated_at triggers ============
DROP TRIGGER IF EXISTS categories_updated_at     ON categories;
DROP TRIGGER IF EXISTS drinks_type_updated_at    ON drinks_type;
DROP TRIGGER IF EXISTS products_updated_at       ON products;
DROP TRIGGER IF EXISTS hero_slides_updated_at    ON hero_slides;
DROP TRIGGER IF EXISTS levels_options_updated_at ON levels_options;
DROP TRIGGER IF EXISTS sugar_level_updated_at    ON sugar_level;
DROP TRIGGER IF EXISTS ice_level_updated_at      ON ice_level;
DROP TRIGGER IF EXISTS coffee_level_updated_at   ON coffee_level;

CREATE TRIGGER categories_updated_at     BEFORE UPDATE ON categories     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER drinks_type_updated_at    BEFORE UPDATE ON drinks_type    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at       BEFORE UPDATE ON products       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER hero_slides_updated_at    BEFORE UPDATE ON hero_slides    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER levels_options_updated_at BEFORE UPDATE ON levels_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sugar_level_updated_at    BEFORE UPDATE ON sugar_level    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ice_level_updated_at      BEFORE UPDATE ON ice_level      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER coffee_level_updated_at   BEFORE UPDATE ON coffee_level   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ migrations (safe to re-run; they also upgrade an EXISTING database) ============
-- CREATE TABLE IF NOT EXISTS never changes a table that already exists, so changes go here.

-- products: "price" is optional, but at least ONE of price / big_size_price / small_size_price is needed
ALTER TABLE products ALTER COLUMN price DROP NOT NULL;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_has_a_price;
ALTER TABLE products ADD CONSTRAINT products_has_a_price
  CHECK (price IS NOT NULL OR big_size_price IS NOT NULL OR small_size_price IS NOT NULL);

-- products: discount (0 = none) and tax (NULL = store default). Both are PERCENTAGES: 10 means 10%
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_percent      NUMERIC(5,2);
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_discount_range;
ALTER TABLE products ADD CONSTRAINT products_discount_range CHECK (discount_percent BETWEEN 0 AND 100);
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tax_range;
ALTER TABLE products ADD CONSTRAINT products_tax_range CHECK (tax_percent IS NULL OR tax_percent BETWEEN 0 AND 100);

-- products: a short label shown on the card, in every language
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge JSONB NOT NULL DEFAULT '{}'::jsonb;

-- level tables: link to their group, plus images
ALTER TABLE sugar_level  ADD COLUMN IF NOT EXISTS levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL;
ALTER TABLE ice_level    ADD COLUMN IF NOT EXISTS levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL;
ALTER TABLE coffee_level ADD COLUMN IF NOT EXISTS levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sugar_level_levels_options_idx  ON sugar_level (levels_options_id);
CREATE INDEX IF NOT EXISTS ice_level_levels_options_idx    ON ice_level (levels_options_id);
CREATE INDEX IF NOT EXISTS coffee_level_levels_options_idx ON coffee_level (levels_options_id);

ALTER TABLE coffee_level  ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE sugar_level   ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE ice_level     ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';
ALTER TABLE levels_options ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';