-- Migration: Add users table and credit system
-- PRD-02: Database Schema Changes

-- Clear existing data for fresh start (as per SETUP_CHECKLIST.md decision)
TRUNCATE TABLE receipt_items CASCADE;
TRUNCATE TABLE receipts CASCADE;

-- Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  credits INTEGER NOT NULL DEFAULT 5,
  preferred_currency TEXT DEFAULT 'PLN',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create credit_transactions table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add user_id to receipts
ALTER TABLE receipts ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_user_date ON receipts(user_id, date DESC);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
