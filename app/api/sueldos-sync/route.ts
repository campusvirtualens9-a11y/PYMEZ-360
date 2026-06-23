import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const S360_URL = 'https://qjyfdunhzwprusnlqxzr.supabase.co'
const S360_KEY = process.env.SUELDOS360_SERVICE_KEY

function s360() {
  if (!S360_URL || !S360_KEY) return null
  return createClient(S360_URL, S360_KEY, { auth: { persistSession: false } })
}

// GET /api/sueldos-sync?token=ABC123&period=2026-06
// Devuelve el resumen de liquidación para generar asientos en PyMEZ 360.
export async function GET(req: NextRequest) {
  const db = s360()
  if (!db) {
    return NextResponse.json({ error: 'Sueldos 360 no configurado en este servidor.' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const token  = searchParams.get('token')?.trim().toUpperCase()
  const period = searchParams.get('period')

  if (!token || !period) {
    return NextResponse.json({ error: 'Se requieren token y period (YYYY-MM).' }, { status: 400 })
  }

  // Buscar empresa por sync_token
  const { data: company } = await db
    .from('companies')
    .select('id, razon_social, cuit')
    .eq('sync_token', token)
    .maybeSingle()

  if (!company) {
    return NextResponse.json(
      { error: 'Código incorrecto. Verificá el código en Sueldos 360 → Empresas.' },
      { status: 403 },
    )
  }

  // Traer liquidaciones del período (excluye borradores)
  const { data: runs, error: runsErr } = await db
    .from('payroll_runs')
    .select('id, periodo, tipo, status, total_bruto, total_neto, total_aportes_trabajador, total_contribuciones_patronales, total_costo_laboral, fecha_pago')
    .eq('company_id', company.id)
    .eq('periodo', period)
    .neq('status', 'borrador')

  if (runsErr) return NextResponse.json({ error: runsErr.message }, { status: 500 })

  if (!runs?.length) {
    return NextResponse.json(
      { error: `No hay liquidación cerrada para ${period} en Sueldos 360. Verificá que la liquidación esté calculada.` },
      { status: 404 },
    )
  }

  // Sumar todos los runs del período (mensual + SAC, etc.)
  const totals = (runs ?? []).reduce(
    (acc, r) => ({
      total_bruto:                    acc.total_bruto + (r.total_bruto ?? 0),
      total_neto:                     acc.total_neto + (r.total_neto ?? 0),
      total_aportes_trabajador:       acc.total_aportes_trabajador + (r.total_aportes_trabajador ?? 0),
      total_contribuciones_patronales: acc.total_contribuciones_patronales + (r.total_contribuciones_patronales ?? 0),
      total_costo_laboral:            acc.total_costo_laboral + (r.total_costo_laboral ?? 0),
    }),
    { total_bruto: 0, total_neto: 0, total_aportes_trabajador: 0, total_contribuciones_patronales: 0, total_costo_laboral: 0 },
  )

  const { count: employeeCount } = await db
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company.id)
    .eq('status', 'activo')

  return NextResponse.json({
    ok: true,
    company_name:   company.razon_social,
    company_cuit:   company.cuit,
    period,
    runs_count:     runs.length,
    employee_count: employeeCount ?? 0,
    totals: {
      total_bruto:                    Math.round(totals.total_bruto * 100) / 100,
      total_neto:                     Math.round(totals.total_neto * 100) / 100,
      total_aportes_trabajador:       Math.round(totals.total_aportes_trabajador * 100) / 100,
      total_contribuciones_patronales: Math.round(totals.total_contribuciones_patronales * 100) / 100,
      total_costo_laboral:            Math.round(totals.total_costo_laboral * 100) / 100,
    },
  })
}
