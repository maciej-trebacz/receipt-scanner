-- PRD-09: Database Optimization - Add indexes for common queries

-- Receipt indexes
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_category_id ON receipts(category_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON receipts(user_id, date DESC);

-- Partial index for pending receipts (commonly queried)
CREATE INDEX IF NOT EXISTS idx_receipts_pending ON receipts(user_id, created_at)
  WHERE status = 'pending' OR status = 'processing';

-- Receipt items indexes
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_type ON receipt_items(product_type);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);

-- Credit transaction indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(user_id, created_at DESC);
