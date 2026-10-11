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
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),   -- standard/default price
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

-- ============ updated_at triggers ============
DROP TRIGGER IF EXISTS categories_updated_at  ON categories;
DROP TRIGGER IF EXISTS drinks_type_updated_at ON drinks_type;
DROP TRIGGER IF EXISTS products_updated_at    ON products;
DROP TRIGGER IF EXISTS hero_slides_updated_at ON hero_slides;
CREATE TRIGGER categories_updated_at  BEFORE UPDATE ON categories  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER drinks_type_updated_at BEFORE UPDATE ON drinks_type FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at    BEFORE UPDATE ON products    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER hero_slides_updated_at BEFORE UPDATE ON hero_slides FOR EACH ROW EXECUTE FUNCTION set_updated_at();
