/**
 * Los asientos tienen que balancear. Siempre.
 *
 * Estos tests ejercitan las funciones reales de lib/accounting/entries.ts
 * contra un cliente de Supabase simulado, y verifican la regla que ningún
 * asiento puede violar: la suma del Debe es igual a la suma del Haber.
 *
 * Cubren bugs que ya ocurrieron en producción: la venta que dejó de generar
 * su asiento, y la retención de IIBB que se imputa al pasivo del impuesto.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Cuentas del plan que el mapa de cuentas busca
const CODIGOS = ['1.1.1', '1.1.2', '1.1.3', '1.2.1', '2.1.1', '3.1.1', '4.1.1', '5.1.1', '1.1.11', '2.1.5', '5.3.14', '2.1.8']

interface Linea { account_id: string; debit: number; credit: number; description?: string }

let lineas: Linea[] = []

/** Cliente de Supabase simulado: registra las líneas en vez de escribirlas. */
function clienteFalso() {
  const cuentas = CODIGOS.map(code => ({ id: 'cta-' + code, code }))
  const armar = (tabla: string) => {
    const b: Record<string, unknown> = {}
    Object.assign(b, {
      select: () => b,
      eq: () => b,
      in: () => b,
      update: () => b,
      single: async () => ({ data: { id: 'asiento-1' }, error: null }),
      maybeSingle: async () => ({ data: { id: 'asiento-1' }, error: null }),
      insert: (payload: unknown) => {
        if (tabla === 'journal_entry_lines') {
          lineas.push(...(Array.isArray(payload) ? payload : [payload]) as Linea[])
        }
        return b
      },
      then: (resolver: (v: unknown) => void) =>
        resolver({ data: tabla === 'chart_of_accounts' ? cuentas : [], error: null }),
    })
    return b
  }
  return { from: (tabla: string) => armar(tabla) }
}

vi.mock('@/lib/supabase/client', () => ({ createClient: () => clienteFalso() }))

import {
  createSaleJournalEntry,
  createPurchaseJournalEntry,
  createCollectionJournalEntry,
  createPaymentJournalEntry,
} from '@/lib/accounting/entries'

const r2 = (n: number) => Math.round(n * 100) / 100
const debe  = () => r2(lineas.reduce((s, l) => s + Number(l.debit), 0))
const haber = () => r2(lineas.reduce((s, l) => s + Number(l.credit), 0))
const enCuenta = (code: string) => lineas.filter(l => l.account_id === 'cta-' + code)

beforeEach(() => { lineas = [] })

describe('asientos de venta', () => {
  it('una venta de contado balancea', async () => {
    await createSaleJournalEntry(
      { id: 'v1', company_id: 'e1', date: '2026-09-01', total: 121000, transaction_type: 'contado', iva_rate: 0.21 },
      0,
    )
    expect(lineas.length).toBeGreaterThan(0)
    expect(debe()).toBe(haber())
  })

  it('una venta a crédito con IVA, IIBB y costo balancea', async () => {
    await createSaleJournalEntry(
      { id: 'v2', company_id: 'e1', date: '2026-09-01', total: 121000, transaction_type: 'cuenta_corriente', iva_rate: 0.21, iibb_rate: 0.035 },
      40000,
    )
    expect(debe()).toBe(haber())
  })

  it('el IIBB se calcula sobre el neto sin IVA, no sobre el total', async () => {
    await createSaleJournalEntry(
      { id: 'v3', company_id: 'e1', date: '2026-09-01', total: 121000, transaction_type: 'contado', iva_rate: 0.21, iibb_rate: 0.035 },
      0,
    )
    // Neto = 121.000 / 1,21 = 100.000 → IIBB 3,5% = 3.500 (y no 4.235 sobre el total)
    const gasto = enCuenta('5.3.14')[0]
    expect(gasto).toBeDefined()
    expect(Number(gasto.debit)).toBe(3500)
  })

  it('el IVA débito se separa del ingreso', async () => {
    await createSaleJournalEntry(
      { id: 'v4', company_id: 'e1', date: '2026-09-01', total: 121000, transaction_type: 'contado', iva_rate: 0.21 },
      0,
    )
    expect(Number(enCuenta('2.1.5')[0].credit)).toBe(21000)  // IVA débito
    expect(Number(enCuenta('4.1.1')[0].credit)).toBe(100000) // Ventas, neto
  })
})

describe('asientos de compra, cobro y pago', () => {
  it('una compra a crédito con IVA balancea', async () => {
    await createPurchaseJournalEntry(
      { id: 'c1', company_id: 'e1', date: '2026-09-01', total: 60500, transaction_type: 'cuenta_corriente', iva_rate: 0.21 },
    )
    expect(debe()).toBe(haber())
  })

  it('un cobro simple balancea', async () => {
    await createCollectionJournalEntry({
      companyId: 'e1', date: '2026-09-02', amount: 50000, collectionId: 'co1', cashAccountType: 'banco',
    })
    expect(debe()).toBe(haber())
  })

  it('un cobro con retención de IIBB balancea y reduce el pasivo del impuesto', async () => {
    await createCollectionJournalEntry({
      companyId: 'e1', date: '2026-09-02', amount: 100000, collectionId: 'co2',
      cashAccountType: 'banco', retencionIibb: 3500,
    })
    expect(debe()).toBe(haber())
    // Lo retenido debita 2.1.8 IIBB a Pagar: es pago a cuenta, no un gasto nuevo
    expect(Number(enCuenta('2.1.8')[0].debit)).toBe(3500)
    // A la cuenta bancaria entra sólo el neto
    expect(Number(enCuenta('1.1.2')[0].debit)).toBe(96500)
  })

  it('un pago a proveedor balancea', async () => {
    await createPaymentJournalEntry({
      companyId: 'e1', date: '2026-09-03', amount: 60500, paymentId: 'p1', cashAccountType: 'caja',
    })
    expect(debe()).toBe(haber())
  })
})
