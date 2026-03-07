-- ============================================
-- Migration 003: Add atomic inbound_stock RPC
-- Prevents race conditions on manual stock entries
-- ============================================

CREATE OR REPLACE FUNCTION inbound_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT 'Manual stock entry'
) RETURNS VOID AS $$
BEGIN
  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;

  INSERT INTO inventory_movements (product_id, type, quantity, notes)
  VALUES (p_product_id, 'inbound', p_quantity, p_notes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
