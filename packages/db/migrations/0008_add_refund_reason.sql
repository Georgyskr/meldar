ALTER TABLE token_transactions DROP CONSTRAINT IF EXISTS token_txn_reason_valid;
ALTER TABLE token_transactions ADD CONSTRAINT token_txn_reason_valid
  CHECK (reason IN ('build', 'improve_prompt', 'daily_bonus', 'signup_bonus', 'referral_bonus', 'monthly_allowance', 'refund'));
