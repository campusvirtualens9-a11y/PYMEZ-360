-- Tipo de comprobante y número correlativo en ventas
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) NOT NULL DEFAULT 'factura_b',
  ADD COLUMN IF NOT EXISTS doc_number     INTEGER;

-- Tipo de comprobante recibido, número correlativo interno y nro del proveedor en compras
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) NOT NULL DEFAULT 'factura_a',
  ADD COLUMN IF NOT EXISTS doc_number    INTEGER,
  ADD COLUMN IF NOT EXISTS supplier_doc  VARCHAR(50);
