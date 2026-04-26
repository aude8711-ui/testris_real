CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  polar_subscription_id   VARCHAR(255) UNIQUE,
  status                  VARCHAR(32) NOT NULL,
  plan                    VARCHAR(32) DEFAULT 'pro',
  current_period_start    TIMESTAMP,
  current_period_end      TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);
