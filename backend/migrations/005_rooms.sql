CREATE TABLE IF NOT EXISTS rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(8) UNIQUE NOT NULL,
  host_id       UUID REFERENCES users(id),
  password_hash VARCHAR(255),
  max_players   INTEGER DEFAULT 2 CHECK (max_players BETWEEN 2 AND 20),
  match_format  VARCHAR(16) DEFAULT 'single',
  status        VARCHAR(16) DEFAULT 'waiting',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_players (
  room_id   UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id),
  role      VARCHAR(16) DEFAULT 'player',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
