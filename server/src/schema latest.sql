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

-- ============ shared helper: auto-update updated_at ============
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============ roles ============
CREATE TABLE IF NOT EXISTS roles (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_title   JSONB NOT NULL,
  description  JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)), -- 1 = active, 0 = hidden
  sort_num     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roles_title_has_en CHECK (role_title ? 'en' AND length(role_title->>'en') > 0)
);

-- Indexes for efficient lookups and sorting
CREATE INDEX IF NOT EXISTS roles_status_sort_idx 
  ON roles (status, sort_num);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS roles_updated_at ON roles;

CREATE TRIGGER roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

-- Indexes for efficient lookups and sorting
CREATE INDEX IF NOT EXISTS positions_status_sort_idx 
  ON positions (status, sort_num);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS positions_updated_at ON positions;

CREATE TRIGGER positions_updated_at
BEFORE UPDATE ON positions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ permissions (Extended) ============
CREATE TABLE IF NOT EXISTS permissions (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         JSONB NOT NULL DEFAULT '{}'::jsonb,
  slug         TEXT NOT NULL UNIQUE DEFAULT '',    -- e.g. "menu_manage", "users_view"
  module       TEXT NOT NULL DEFAULT 'general',    -- e.g. "menu", "settings", "reports"
  description  JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_num     INTEGER NOT NULL DEFAULT 0,
  status       SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT permissions_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

CREATE INDEX IF NOT EXISTS permissions_status_sort_idx ON permissions (status, sort_num);
CREATE INDEX IF NOT EXISTS permissions_slug_idx ON permissions (slug);

DROP TRIGGER IF EXISTS permissions_updated_at ON permissions;
CREATE TRIGGER permissions_updated_at
BEFORE UPDATE ON permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ genders ============
CREATE TABLE IF NOT EXISTS genders (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gender      JSONB NOT NULL,
  sc_gender   JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_num    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at trigger for genders
DROP TRIGGER IF EXISTS genders_updated_at ON genders;
CREATE TRIGGER genders_updated_at
BEFORE UPDATE ON genders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ nationalities ============
CREATE TABLE IF NOT EXISTS nationalities (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nationality        JSONB NOT NULL,
  nation_code        TEXT NOT NULL DEFAULT '',
  country_flags_id   INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status             SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1)), -- 0 = active, 1 = not active
  sort_num           INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nationalities_name_has_en CHECK (nationality ? 'en' AND length(nationality->>'en') > 0)
);

-- Indexes for efficient lookups and sorting
CREATE INDEX IF NOT EXISTS nationalities_status_sort_idx 
  ON nationalities (status, sort_num);

CREATE INDEX IF NOT EXISTS nationalities_country_flags_idx 
  ON nationalities (country_flags_id);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS nationalities_updated_at ON nationalities;

CREATE TRIGGER nationalities_updated_at
BEFORE UPDATE ON nationalities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

-- Automatically update updated_at
DROP TRIGGER IF EXISTS maps_updated_at ON maps;

CREATE TRIGGER maps_updated_at
BEFORE UPDATE ON maps
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


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
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL,
  name        JSONB NOT NULL DEFAULT '{}'::jsonb,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ice_level ============
CREATE TABLE IF NOT EXISTS ice_level (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL,
  name               JSONB NOT NULL DEFAULT '{}'::jsonb,
  description        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num           INTEGER NOT NULL DEFAULT 0,
  array_categories   INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes  INTEGER[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ coffee_level ============
CREATE TABLE IF NOT EXISTS coffee_level (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  levels_options_id INTEGER REFERENCES levels_options(id) ON DELETE SET NULL,
  name               JSONB NOT NULL DEFAULT '{}'::jsonb,
  price              NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  sort_num           INTEGER NOT NULL DEFAULT 0,
  array_categories   INTEGER[] NOT NULL DEFAULT '{}',
  array_drinkstypes  INTEGER[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS levels_options_status_sort_idx
  ON levels_options (status, sort_num);

CREATE INDEX IF NOT EXISTS sugar_level_status_sort_idx
  ON sugar_level (status, sort_num);

CREATE INDEX IF NOT EXISTS ice_level_status_sort_idx
  ON ice_level (status, sort_num);

CREATE INDEX IF NOT EXISTS coffee_level_status_sort_idx
  ON coffee_level (status, sort_num);

CREATE INDEX IF NOT EXISTS levels_options_categories_gin_idx
  ON levels_options USING GIN (array_categories);

CREATE INDEX IF NOT EXISTS levels_options_drinkstypes_gin_idx
  ON levels_options USING GIN (array_drinkstypes);

CREATE INDEX IF NOT EXISTS ice_level_categories_gin_idx
  ON ice_level USING GIN (array_categories);

CREATE INDEX IF NOT EXISTS ice_level_drinkstypes_gin_idx
  ON ice_level USING GIN (array_drinkstypes);

CREATE INDEX IF NOT EXISTS coffee_level_categories_gin_idx
  ON coffee_level USING GIN (array_categories);

CREATE INDEX IF NOT EXISTS coffee_level_drinkstypes_gin_idx
  ON coffee_level USING GIN (array_drinkstypes);

-- ============ country_flags ============
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

-- if the table already existed with missing columns or NULLs, bring it in line (safe to re-run)
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

-- ============ currencies ============
CREATE TABLE IF NOT EXISTS currencies (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             JSONB NOT NULL DEFAULT '{}'::jsonb,        -- {"en":"Cambodian Riel","km":"រៀល"}
  currency_symbol  TEXT DEFAULT NULL,                         -- e.g. "៛", "$"
  description      JSONB NOT NULL DEFAULT '{}'::jsonb,        -- {"en":"...","km":"..."}
  country_flags_id INTEGER REFERENCES country_flags(id) ON DELETE SET NULL,
  status           SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)), -- 1 = active, 0 = hidden
  sort_num         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT currencies_name_has_en CHECK (name ? 'en' AND length(name->>'en') > 0)
);

-- Indexes for efficient lookups and sorting
CREATE INDEX IF NOT EXISTS currencies_status_sort_idx 
  ON currencies (status, sort_num);

CREATE INDEX IF NOT EXISTS currencies_country_flags_idx 
  ON currencies (country_flags_id);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS currencies_updated_at ON currencies;

CREATE TRIGGER currencies_updated_at
BEFORE UPDATE ON currencies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

-- Safe checks or column migrations if table already exists
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS currencies_id INTEGER;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS value NUMERIC(15, 6);
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS description JSONB;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS country_flags_id INTEGER;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS status SMALLINT;
ALTER TABLE exchange_rate ADD COLUMN IF NOT EXISTS sort_num INTEGER;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS exchange_rate_updated_at ON exchange_rate;
CREATE TRIGGER exchange_rate_updated_at BEFORE UPDATE ON exchange_rate FOR EACH ROW EXECUTE FUNCTION set_updated_at();










-- ============ updated_at triggers ============
DROP TRIGGER IF EXISTS categories_updated_at  ON categories;
DROP TRIGGER IF EXISTS drinks_type_updated_at ON drinks_type;
DROP TRIGGER IF EXISTS products_updated_at    ON products;
DROP TRIGGER IF EXISTS hero_slides_updated_at ON hero_slides;
CREATE TRIGGER categories_updated_at  BEFORE UPDATE ON categories  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER drinks_type_updated_at BEFORE UPDATE ON drinks_type FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at    BEFORE UPDATE ON products    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER hero_slides_updated_at BEFORE UPDATE ON hero_slides FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS levels_options_updated_at ON levels_options;
DROP TRIGGER IF EXISTS sugar_level_updated_at ON sugar_level;
DROP TRIGGER IF EXISTS ice_level_updated_at ON ice_level;
DROP TRIGGER IF EXISTS coffee_level_updated_at ON coffee_level;

CREATE TRIGGER levels_options_updated_at
BEFORE UPDATE ON levels_options
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sugar_level_updated_at
BEFORE UPDATE ON sugar_level
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER ice_level_updated_at
BEFORE UPDATE ON ice_level
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER coffee_level_updated_at
BEFORE UPDATE ON coffee_level
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ migrations (safe to re-run; they also upgrade an EXISTING database) ============
-- CREATE TABLE IF NOT EXISTS never changes a table that already exists, so changes go here.

-- products: "price" is optional, but at least ONE of price / big_size_price / small_size_price is needed
ALTER TABLE products ALTER COLUMN price DROP NOT NULL;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_has_a_price;
ALTER TABLE products ADD CONSTRAINT products_has_a_price
  CHECK (price IS NOT NULL OR big_size_price IS NOT NULL OR small_size_price IS NOT NULL);

-- products: discount (always a number, 0 = none) and tax (NULL = use the store default). Both are PERCENTAGES: 10 means 10%
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_percent      NUMERIC(5,2);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_discount_range;
ALTER TABLE products ADD CONSTRAINT products_discount_range CHECK (discount_percent BETWEEN 0 AND 100);
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tax_range;
ALTER TABLE products ADD CONSTRAINT products_tax_range CHECK (tax_percent IS NULL OR tax_percent BETWEEN 0 AND 100);

-- products: a short label shown on the card, in every language, e.g. {"en":"Best Sale","km":"..."}
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge JSONB NOT NULL DEFAULT '{}'::jsonb;


-- Add levels_options_id to existing level tables
ALTER TABLE sugar_level
  ADD COLUMN IF NOT EXISTS levels_options_id INTEGER
  REFERENCES levels_options(id) ON DELETE SET NULL;

ALTER TABLE ice_level
  ADD COLUMN IF NOT EXISTS levels_options_id INTEGER
  REFERENCES levels_options(id) ON DELETE SET NULL;

ALTER TABLE coffee_level
  ADD COLUMN IF NOT EXISTS levels_options_id INTEGER
  REFERENCES levels_options(id) ON DELETE SET NULL;

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS sugar_level_levels_options_idx
  ON sugar_level (levels_options_id);

CREATE INDEX IF NOT EXISTS ice_level_levels_options_idx
  ON ice_level (levels_options_id);

CREATE INDEX IF NOT EXISTS coffee_level_levels_options_idx
  ON coffee_level (levels_options_id);

ALTER TABLE coffee_level
  ADD COLUMN IF NOT EXISTS img       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';

ALTER TABLE sugar_level
  ADD COLUMN IF NOT EXISTS img       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';

ALTER TABLE ice_level
  ADD COLUMN IF NOT EXISTS img       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';

-- only if levels_options also stores an image in its route:
ALTER TABLE levels_options
  ADD COLUMN IF NOT EXISTS img       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumbnail TEXT NOT NULL DEFAULT '';