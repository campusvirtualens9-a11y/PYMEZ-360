import { createClient } from '@/lib/supabase/client'

interface AccountMap {
  caja: string
  banco: string
  clientes: string
  mercaderias: string
  proveedores: string
  capital: string
  ventas: string
  costo_venta: string
}

export async function getAccountMap(companyId: string): Promise<AccountMap | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('chart_of_accounts')
    .select('id, code')
    .eq('company_id', companyId)
    .in('code', ['1.1.1', '1.1.2', '1.1.3', '1.2.1', '2.1.1', '3.1.1', '4.1.1', '5.1.1'])

  if (!data || data.length === 0) return null
  const find = (code: string) => data.find((a) => a.code === code)?.id ?? ''
  return {
    caja:        find('1.1.1'),
    banco:       find('1.1.2'),
    clientes:    find('1.1.3'),
    mercaderias: find('1.2.1'),
    proveedores: find('2.1.1'),
    capital:     find('3.1.1'),
    ventas:      find('4.1.1'),
    costo_venta: find('5.1.1'),
  }
}

// ─── Compra ────────────────────────────────────────────────────────────────

interface PurchaseRef {
  id: string; company_id: string; date: string; total: number; transaction_type: string
}

export async function createPurchaseJournalEntry(
  purchase: PurchaseRef,
  _cashAccountId: string | null
): Promise<string | null> {
  const supabase = createClient()
  const accounts = await getAccountMap(purchase.company_id)
  if (!accounts) return null

  const isContado = purchase.transaction_type === 'contado'
  const creditAccount = isContado ? accounts.caja : accounts.proveedores

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      company_id: purchase.company_id,
      date: purchase.date,
      description: `Compra ${isContado ? 'de contado' : 'a cuenta corriente'}`,
      entry_type: 'automatico',
      reference_type: 'purchase',
      reference_id: purchase.id,
    })
    .select('id')
    .single()

  if (error || !entry) return null

  await supabase.from('journal_entry_lines').insert([
    { journal_entry_id: entry.id, account_id: accounts.mercaderias, debit: purchase.total, credit: 0, description: 'Mercaderías ingresadas' },
    { journal_entry_id: entry.id, account_id: creditAccount, debit: 0, credit: purchase.total, description: isContado ? 'Pago en efectivo/banco' : 'Deuda con proveedor' },
  ])

  return entry.id
}

// ─── Venta ─────────────────────────────────────────────────────────────────

interface SaleRef {
  id: string; company_id: string; date: string; total: number; transaction_type: string
}

export async function createSaleJournalEntry(
  sale: SaleRef,
  totalCost: number
): Promise<string | null> {
  const supabase = createClient()
  const accounts = await getAccountMap(sale.company_id)
  if (!accounts) return null

  const isContado = sale.transaction_type === 'contado'
  const debitAccount = isContado ? accounts.caja : accounts.clientes

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      company_id: sale.company_id,
      date: sale.date,
      description: `Venta ${isContado ? 'de contado' : 'a cuenta corriente'}`,
      entry_type: 'automatico',
      reference_type: 'sale',
      reference_id: sale.id,
    })
    .select('id')
    .single()

  if (error || !entry) return null

  const lines: { journal_entry_id: string; account_id: string; debit: number; credit: number; description: string }[] = [
    { journal_entry_id: entry.id, account_id: debitAccount, debit: sale.total, credit: 0, description: isContado ? 'Cobro en efectivo/banco' : 'Cuenta a cobrar' },
    { journal_entry_id: entry.id, account_id: accounts.ventas, debit: 0, credit: sale.total, description: 'Ingreso por venta' },
  ]

  if (totalCost > 0) {
    lines.push(
      { journal_entry_id: entry.id, account_id: accounts.costo_venta, debit: totalCost, credit: 0, description: 'Costo de la mercadería vendida' },
      { journal_entry_id: entry.id, account_id: accounts.mercaderias, debit: 0, credit: totalCost, description: 'Egreso de mercadería del inventario' }
    )
  }

  await supabase.from('journal_entry_lines').insert(lines)
  return entry.id
}

// ─── Cobro ─────────────────────────────────────────────────────────────────

export async function createCollectionJournalEntry(params: {
  companyId: string
  date: string
  amount: number
  collectionId: string
  cashAccountType?: string
  customerName?: string
}): Promise<string | null> {
  const supabase = createClient()
  const accounts = await getAccountMap(params.companyId)
  if (!accounts) return null

  const debitAccount = params.cashAccountType === 'banco' ? accounts.banco : accounts.caja

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      company_id: params.companyId,
      date: params.date,
      description: `Cobro a cliente${params.customerName ? ': ' + params.customerName : ''}`,
      entry_type: 'automatico',
      reference_type: 'collection',
      reference_id: params.collectionId,
    })
    .select('id')
    .single()

  if (error || !entry) return null

  await supabase.from('journal_entry_lines').insert([
    { journal_entry_id: entry.id, account_id: debitAccount, debit: params.amount, credit: 0, description: 'Cobro recibido en caja/banco' },
    { journal_entry_id: entry.id, account_id: accounts.clientes, debit: 0, credit: params.amount, description: 'Cancelación cuenta a cobrar de cliente' },
  ])

  return entry.id
}

// ─── Pago a proveedor ──────────────────────────────────────────────────────

export async function createPaymentJournalEntry(params: {
  companyId: string
  date: string
  amount: number
  paymentId: string
  cashAccountType?: string
  supplierName?: string
}): Promise<string | null> {
  const supabase = createClient()
  const accounts = await getAccountMap(params.companyId)
  if (!accounts) return null

  const creditAccount = params.cashAccountType === 'banco' ? accounts.banco : accounts.caja

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      company_id: params.companyId,
      date: params.date,
      description: `Pago a proveedor${params.supplierName ? ': ' + params.supplierName : ''}`,
      entry_type: 'automatico',
      reference_type: 'payment',
      reference_id: params.paymentId,
    })
    .select('id')
    .single()

  if (error || !entry) return null

  await supabase.from('journal_entry_lines').insert([
    { journal_entry_id: entry.id, account_id: accounts.proveedores, debit: params.amount, credit: 0, description: 'Cancelación deuda con proveedor' },
    { journal_entry_id: entry.id, account_id: creditAccount, debit: 0, credit: params.amount, description: 'Pago realizado' },
  ])

  return entry.id
}

// ─── Constitución ──────────────────────────────────────────────────────────

export async function createConstitutionJournalEntry(params: {
  companyId: string
  date: string
  cashAmount: number
  bankAmount: number
}): Promise<string | null> {
  const supabase = createClient()
  const accounts = await getAccountMap(params.companyId)
  if (!accounts) return null

  const total = params.cashAmount + params.bankAmount
  if (total === 0) return null

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      company_id: params.companyId,
      date: params.date,
      description: 'Asiento de constitución — Aporte inicial de capital',
      entry_type: 'automatico',
    })
    .select('id')
    .single()

  if (error || !entry) return null

  const lines: { journal_entry_id: string; account_id: string; debit: number; credit: number; description: string }[] = []

  if (params.cashAmount > 0) {
    lines.push({ journal_entry_id: entry.id, account_id: accounts.caja, debit: params.cashAmount, credit: 0, description: 'Efectivo aportado por los socios' })
  }
  if (params.bankAmount > 0) {
    lines.push({ journal_entry_id: entry.id, account_id: accounts.banco, debit: params.bankAmount, credit: 0, description: 'Depósito bancario inicial' })
  }
  lines.push({ journal_entry_id: entry.id, account_id: accounts.capital, debit: 0, credit: total, description: 'Capital social aportado' })

  await supabase.from('journal_entry_lines').insert(lines)
  return entry.id
}

// ─── Asiento manual ────────────────────────────────────────────────────────

export async function createManualJournalEntry(params: {
  companyId: string
  createdBy: string
  date: string
  description: string
  lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>
}): Promise<{ id: string | null; error: string | null }> {
  const totalDebit  = params.lines.reduce((s, l) => s + l.debit,  0)
  const totalCredit = params.lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { id: null, error: 'El asiento no balancea: Debe ≠ Haber' }
  }

  const supabase = createClient()
  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      company_id: params.companyId,
      date: params.date,
      description: params.description,
      entry_type: 'manual',
      created_by: params.createdBy,
    })
    .select('id')
    .single()

  if (error || !entry) return { id: null, error: 'Error al guardar el asiento' }

  await supabase.from('journal_entry_lines').insert(
    params.lines.map((l) => ({
      journal_entry_id: entry.id,
      account_id: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description ?? '',
    }))
  )

  return { id: entry.id, error: null }
}

// ─── Explicaciones educativas ───────────────────────────────────────────────

type EntryType =
  | 'compra_contado' | 'compra_credito'
  | 'venta_contado'  | 'venta_credito'
  | 'cobro'          | 'pago'
  | 'constitucion'

export function getEntryExplanation(type: EntryType): string {
  const explanations: Record<EntryType, string> = {
    compra_contado:
      '📦 Realizaste una compra de contado. El inventario aumentó (Debe: Mercaderías) y la caja/banco disminuyó (Haber: Caja/Banco). El dinero salió inmediatamente.',
    compra_credito:
      '📦 Realizaste una compra a cuenta corriente. El inventario aumentó (Debe: Mercaderías) y se generó una deuda con el proveedor (Haber: Proveedores). Pagás después.',
    venta_contado:
      '🛒 Realizaste una venta de contado. La caja/banco aumentó (Debe: Caja/Banco) y se registró el ingreso por venta (Haber: Ventas). El dinero entró de inmediato.',
    venta_credito:
      '🛒 Realizaste una venta a cuenta corriente. Se generó una cuenta a cobrar del cliente (Debe: Clientes) y se registró el ingreso (Haber: Ventas). Cobrás después.',
    cobro:
      '💰 Cobraste una deuda de un cliente. La caja/banco aumentó (Debe: Caja/Banco) y la cuenta a cobrar del cliente disminuyó (Haber: Clientes).',
    pago:
      '💸 Pagaste a un proveedor. La deuda con el proveedor disminuyó (Debe: Proveedores) y la caja/banco disminuyó (Haber: Caja/Banco).',
    constitucion:
      '🏛️ Asiento de constitución. Los socios aportaron capital a la empresa. El activo (Caja/Banco) aumentó (Debe) y el Patrimonio Neto — Capital Social — también aumentó (Haber). Este es el punto de partida contable de tu empresa.',
  }
  return explanations[type] ?? ''
}

// ─── Modelos de asientos sugeridos ─────────────────────────────────────────

export interface JournalTemplate {
  code: string
  title: string
  description: string
  lines: Array<{ accountCode: string; accountName: string; side: 'debe' | 'haber'; label: string }>
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    code: 'GASTO_ALQUILER',
    title: 'Pago de alquiler',
    description: 'Registro del pago mensual de alquiler del local.',
    lines: [
      { accountCode: '5.3.3', accountName: 'Alquileres y Arrendamientos', side: 'debe',  label: 'Gasto de alquiler' },
      { accountCode: '1.1.1', accountName: 'Caja',                        side: 'haber', label: 'Pago en efectivo'  },
    ],
  },
  {
    code: 'GASTO_SUELDO',
    title: 'Pago de sueldos',
    description: 'Registro del pago de sueldos y cargas sociales del período.',
    lines: [
      { accountCode: '5.3.1', accountName: 'Sueldos y Jornales (Administración)', side: 'debe',  label: 'Sueldo bruto' },
      { accountCode: '5.3.2', accountName: 'Cargas Sociales (Administración)',    side: 'debe',  label: 'Cargas sociales' },
      { accountCode: '1.1.2', accountName: 'Banco Cuenta Corriente',              side: 'haber', label: 'Pago bancario' },
    ],
  },
  {
    code: 'GASTO_SERVICIOS',
    title: 'Pago de servicios públicos',
    description: 'Pago de luz, gas, agua o internet.',
    lines: [
      { accountCode: '5.3.4', accountName: 'Servicios Públicos (Luz, Gas, Agua)', side: 'debe',  label: 'Gasto servicios' },
      { accountCode: '1.1.2', accountName: 'Banco Cuenta Corriente',              side: 'haber', label: 'Débito bancario' },
    ],
  },
  {
    code: 'GASTO_SEGURO',
    title: 'Pago de seguro',
    description: 'Pago de prima de seguros.',
    lines: [
      { accountCode: '5.3.9', accountName: 'Seguros',                side: 'debe',  label: 'Prima de seguro' },
      { accountCode: '1.1.1', accountName: 'Caja',                   side: 'haber', label: 'Pago en efectivo' },
    ],
  },
  {
    code: 'COMPRA_BIEN_USO',
    title: 'Compra de bien de uso',
    description: 'Incorporación de un bien de uso (maquinaria, mueble, rodado).',
    lines: [
      { accountCode: '1.4.3', accountName: 'Maquinaria y Equipos', side: 'debe',  label: 'Costo del bien' },
      { accountCode: '1.1.2', accountName: 'Banco Cuenta Corriente', side: 'haber', label: 'Pago bancario' },
    ],
  },
  {
    code: 'AMORTIZACION',
    title: 'Amortización de bien de uso',
    description: 'Depreciación mensual de bienes de uso.',
    lines: [
      { accountCode: '5.3.10', accountName: 'Amortizaciones y Depreciaciones',  side: 'debe',  label: 'Cuota de amortización' },
      { accountCode: '1.4.10', accountName: 'Amortización Acum. Maquinaria',    side: 'haber', label: 'Amortización acumulada' },
    ],
  },
  {
    code: 'PRESTAMO_RECIBIDO',
    title: 'Préstamo bancario recibido',
    description: 'Ingreso de un préstamo bancario.',
    lines: [
      { accountCode: '1.1.2', accountName: 'Banco Cuenta Corriente',          side: 'debe',  label: 'Acreditación préstamo' },
      { accountCode: '2.1.3', accountName: 'Préstamos Bancarios Corrientes',  side: 'haber', label: 'Deuda bancaria' },
    ],
  },
  {
    code: 'HONORARIOS',
    title: 'Honorarios profesionales',
    description: 'Pago de honorarios a contador/abogado.',
    lines: [
      { accountCode: '5.3.6', accountName: 'Honorarios Contables y Legales', side: 'debe',  label: 'Honorarios' },
      { accountCode: '1.1.1', accountName: 'Caja',                           side: 'haber', label: 'Pago en efectivo' },
    ],
  },
]
