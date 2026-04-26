CREATE TABLE IF NOT EXISTS user_settings (
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  key_bindings  JSONB DEFAULT '{}',
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key   VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO system_settings (key, value)
  VALUES ('maintenance_mode', 'false')
  ON CONFLICT (key) DO NOTHING;
