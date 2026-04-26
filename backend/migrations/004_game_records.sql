CREATE TABLE IF NOT EXISTS game_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID,
  player1_id    UUID REFERENCES users(id),
  player2_id    UUID REFERENCES users(id),
  winner_id     UUID REFERENCES users(id),
  is_ranked     BOOLEAN DEFAULT FALSE,
  is_void       BOOLEAN DEFAULT FALSE,
  p1_tr_before  FLOAT,
  p1_tr_after   FLOAT,
  p2_tr_before  FLOAT,
  p2_tr_after   FLOAT,
  duration_sec  INTEGER,
  played_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_records_player1 ON game_records(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_records_player2 ON game_records(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_records_room    ON game_records(room_id);
