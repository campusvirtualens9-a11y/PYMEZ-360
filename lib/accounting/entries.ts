import { createClient } from '@/lib/supabase/client'

interface AccountMap {
  caja: string
  banco: string
  clientes: string
  mercaderias: string
  proveedores: string
  ventas: string
  costo_venta: string
}

export async function getAccountMap(companyId: string): Promise<AccountMap | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('chart_of_accounts')
    .select('id, code')
    .eq('company_id', companyId)
    .in('code', ['1.1.1', '1.1.2', '1.1.3', '1.2.1', '2.1.1', '4.1.1', '5.1.1'])

  if (!data || data.length === 0) return null

  const find = (code: string) => data.find((a) => a.code === code)?.id ?? ''

  return {
    caja:       find('1.1.1'),
    banco:      find('1.1.2'),
    clientes:   find('1.1.3'),
    mercaderias:find('1.2.1'),
    proveedores:find('2.1.1'),
    ventas:     find('4.1.1'),
    costo_venta:find('5.1.1'),
  }
}

interface PurchaseRef {
  id: string
  company_id: string
  date: string
  total: number
  transaction_type: string
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
    {
      journal_entry_id: entry.id,
      account_id: accounts.mercaderias,
      debit: purchase.total,
      credit: 0,
      description: 'Mercaderías ingresadas',
    },
    {
      journal_entry_id: entry.id,
      account_id: creditAccount,
      debit: 0,
      credit: purchase.total,
      description: isContado ? 'Pago en efectivo/banco' : 'Deuda con proveedor',
    },
  ])

  return entry.id
}

interface SaleRef {
  id: string
  company_id: string
  date: string
  total: number
  transaction_type: string
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

  const lines: {
    journal_entry_id: string
    account_id: string
    debit: number
    credit: number
    description: string
  }[] = [
    {
      journal_entry_id: entry.id,
      account_id: debitAccount,
      debit: sale.total,
      credit: 0,
      description: isContado ? 'Cobro en efectivo/banco' : 'Cuenta a cobrar',
    },
    {
      journal_entry_id: entry.id,
      account_id: accounts.ventas,
      debit: 0,
      credit: sale.total,
      description: 'Ingreso por venta',
    },
  ]

  if (totalCost > 0) {
    lines.push(
      {
        journal_entry_id: entry.id,
        account_id: accounts.costo_venta,
        debit: totalCost,
        credit: 0,
        description: 'Costo de la mercadería vendida',
      },
      {
        journal_entry_id: entry.id,
        account_id: accounts.mercaderias,
        debit: 0,
        credit: totalCost,
        description: 'Egreso de mercadería',
      }
    )
  }

  await supabase.from('journal_entry_lines').insert(lines)

  return entry.id
}

type EntryType =
  | 'compra_contado'
  | 'compra_credito'
  | 'venta_contado'
  | 'venta_credito'
  | 'cobro'
  | 'pago'

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
  }
  return explanations[type] ?? ''
}
