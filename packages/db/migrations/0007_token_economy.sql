BEGIN;

CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT token_txn_reason_valid
    CHECK (reason IN ('build', 'improve_prompt', 'daily_bonus', 'signup_bonus', 'referral_bonus', 'monthly_allowance'))
);

CREATE INDEX idx_token_transactions_user_created
  ON token_transactions (user_id, created_at DESC);

ALTER TABLE users ADD COLUMN token_balance INTEGER NOT NULL DEFAULT 200;
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN lifetime_tokens_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT users_token_balance_non_negative CHECK (token_balance >= 0);

COMMIT;
