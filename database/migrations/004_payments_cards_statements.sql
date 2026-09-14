CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  category TEXT NOT NULL CHECK (category IN ('ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE')),
  biller_name TEXT NOT NULL,
  consumer_number TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
-- Duplicate-payment prevention (same biller/consumer/amount within a short
-- window) is enforced in the payments service layer, not via a DB
-- constraint, since "recent" is a sliding time window rather than a fixed key.

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  card_type TEXT NOT NULL CHECK (card_type IN ('DEBIT', 'CREDIT')),
  card_number TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'FROZEN')),
  credit_limit NUMERIC(14, 2),
  available_limit NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_user_id ON cards(user_id);

CREATE TABLE statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance NUMERIC(14, 2) NOT NULL,
  closing_balance NUMERIC(14, 2) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_statements_account_id ON statements(account_id);
