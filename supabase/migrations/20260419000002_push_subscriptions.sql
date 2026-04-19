CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  endpoint     text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  locale       text NOT NULL DEFAULT 'nl'
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only server (service role) can read/write subscriptions
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
