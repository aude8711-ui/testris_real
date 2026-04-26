CREATE TABLE IF NOT EXISTS ranks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  tr            FLOAT DEFAULT 0,
  tier          VARCHAR(4) DEFAULT 'D',
  wins          INTEGER DEFAULT 0,
  losses        INTEGER DEFAULT 0,
  games_played  INTEGER DEFAULT 0,
  peak_tr       FLOAT DEFAULT 0,
  peak_tier     VARCHAR(4) DEFAULT 'D',
  updated_at    TIMESTAMP DEFAULT NOW()
);
