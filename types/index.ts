export type UserRole = 'admin' | 'teacher' | 'student' | 'guest'

export type BusinessSector =
  | 'comercial'
  | 'construccion'
  | 'salud'
  | 'gastronomia'
  | 'transporte'

export type TransactionType = 'contado' | 'cuenta_corriente'

export type MovementType = 'entrada' | 'salida' | 'ajuste'

export type JournalEntryType = 'automatico' | 'manual'

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  xp: number
  level: number
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  sector: BusinessSector
  cuit: string
  fiscal_condition: string
  address?: string
  logo_url?: string
  currency: string
  sim_start_date: string
  owner_id: string
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  company_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  cuit?: string
  balance: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  company_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  cuit?: string
  balance: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  company_id: string
  code: string
  name: string
  description?: string
  category?: string
  unit: string
  cost_price: number
  sale_price: number
  stock_current: number
  stock_min: number
  warehouse_id?: string
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  company_id: string
  supplier_id: string
  supplier_name?: string
  date: string
  total: number
  transaction_type: TransactionType
  payment_method?: PaymentMethod
  status: 'pendiente' | 'pagado' | 'cancelado'
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  product_name?: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Sale {
  id: string
  company_id: string
  customer_id: string
  customer_name?: string
  date: string
  total: number
  transaction_type: TransactionType
  payment_method?: PaymentMethod
  status: 'pendiente' | 'cobrado' | 'cancelado'
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name?: string
  quantity: number
  unit_price: number
  cost_price: number
  subtotal: number
}

export interface CashAccount {
  id: string
  company_id: string
  name: string
  type: 'caja' | 'banco'
  balance: number
  created_at: string
  updated_at: string
}

export interface CashMovement {
  id: string
  company_id: string
  cash_account_id: string
  date: string
  type: 'ingreso' | 'egreso'
  amount: number
  concept: string
  reference_type?: string
  reference_id?: string
  created_at: string
}

export interface ChartOfAccount {
  id: string
  company_id: string
  code: string
  name: string
  type: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso'
  parent_id?: string
  is_active: boolean
  created_at: string
}

export interface JournalEntry {
  id: string
  company_id: string
  date: string
  description: string
  entry_type: JournalEntryType
  reference_type?: string
  reference_id?: string
  created_by: string
  created_at: string
  lines?: JournalEntryLine[]
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  account_id: string
  account_name?: string
  account_code?: string
  debit: number
  credit: number
  description?: string
}

export interface StockMovement {
  id: string
  company_id: string
  product_id: string
  product_name?: string
  date: string
  type: MovementType
  quantity: number
  unit_cost?: number
  reason?: string
  reference_type?: string
  reference_id?: string
  created_at: string
}

export interface Receivable {
  id: string
  company_id: string
  sale_id: string
  customer_id: string
  customer_name?: string
  original_amount: number
  pending_amount: number
  due_date?: string
  status: 'pendiente' | 'cobrado_parcial' | 'cobrado'
  created_at: string
  updated_at: string
}

export interface Payable {
  id: string
  company_id: string
  purchase_id: string
  supplier_id: string
  supplier_name?: string
  original_amount: number
  pending_amount: number
  due_date?: string
  status: 'pendiente' | 'pagado_parcial' | 'pagado'
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  code: string
  title: string
  description: string
  xp_reward: number
  sector?: BusinessSector
  module: string
  required_count: number
}

export interface UserChallenge {
  id: string
  profile_id: string
  company_id: string
  challenge_id: string
  challenge?: Challenge
  progress: number
  completed: boolean
  completed_at?: string
}

export interface XpEvent {
  id: string
  profile_id: string
  company_id: string
  amount: number
  reason: string
  created_at: string
}

export interface DashboardStats {
  company: Company
  cash_balance: number
  monthly_sales: number
  monthly_purchases: number
  total_receivables: number
  total_payables: number
  low_stock_count: number
  recent_operations: RecentOperation[]
  pending_challenges: UserChallenge[]
  progress_percent: number
  xp: number
  level: number
}

export interface RecentOperation {
  id: string
  type: 'compra' | 'venta' | 'cobro' | 'pago' | 'movimiento'
  description: string
  amount: number
  date: string
}
