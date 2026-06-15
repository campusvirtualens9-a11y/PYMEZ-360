import { Card, CardContent } from '@/components/ui/Card'

export default function TaxesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Obligaciones Fiscales</h1>
        <p className="text-slate-500 text-sm mt-1">
          Guía educativa sobre los principales impuestos que afectan a una PyME en Argentina.
          Los montos y vencimientos son referenciales para fines de aprendizaje.
        </p>
      </div>

      {/* ── IIBB ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🏛️</div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ingresos Brutos (IIBB)</h2>
            <p className="text-sm text-slate-500">Impuesto provincial · Dirección General de Rentas (DGR) Misiones</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">¿Qué grava?</p>
              <p className="text-sm text-slate-700">
                El ejercicio habitual y a título oneroso de una actividad económica dentro de la provincia de Misiones,
                independientemente de la naturaleza del sujeto.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">¿Cómo se calcula?</p>
              <p className="text-sm text-slate-700">
                <strong>Base imponible = ingresos brutos del mes − IVA</strong> (el IVA es federal y no integra la base).
                <br /><br />
                Alícuota general para actividades comerciales en Misiones: <strong>3%</strong>.
              </p>
              <div className="mt-2 bg-purple-50 rounded p-2 text-xs font-mono text-purple-800">
                IIBB = ingresos netos × 3%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">¿Cuándo se paga?</p>
              <p className="text-sm text-slate-700">
                <strong>Pago mensual</strong> — se presenta una Declaración Jurada (DDJJ) ante la DGR Misiones.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li className="flex gap-2"><span className="text-purple-500">📅</span> Vencimiento: <strong>día 25 de cada mes</strong> (o hábil siguiente)</li>
                <li className="flex gap-2"><span className="text-purple-500">🏦</span> Dónde pagar: DGR Misiones (dgr.misiones.gov.ar) o bancos habilitados</li>
                <li className="flex gap-2"><span className="text-purple-500">📋</span> Período: ingresos del mes anterior</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Asiento contable mensual</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">Al devengar el impuesto (con cada venta):</p>
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-700">Debe · 5.3.14 Impuesto a los Ingresos Brutos</span><span className="text-green-700">$ XX</span></div>
                  <div className="flex justify-between pl-4"><span className="text-slate-500">Haber · 2.1.8 IIBB a Pagar</span><span className="text-red-600">$ XX</span></div>
                </div>
                <p className="text-xs text-slate-400 mt-1">El gasto se reconoce junto con el ingreso que lo genera.</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Al pagar la DDJJ mensual a la DGR:</p>
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-700">Debe · 2.1.8 IIBB a Pagar</span><span className="text-green-700">$ XX</span></div>
                  <div className="flex justify-between pl-4"><span className="text-slate-500">Haber · 1.1.2 Banco</span><span className="text-red-600">$ XX</span></div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Se cancela la deuda al efectuar el pago bancario.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Calendario IIBB Misiones — ejemplo mes corriente</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-xs">
            <div className="bg-white rounded-lg p-3 border border-amber-100">
              <p className="font-semibold text-amber-700">Enero</p>
              <p>DDJJ ingresos enero</p>
              <p className="text-amber-600 mt-1">Vence: 25 de febrero</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-100">
              <p className="font-semibold text-amber-700">Febrero</p>
              <p>DDJJ ingresos febrero</p>
              <p className="text-amber-600 mt-1">Vence: 25 de marzo</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-100">
              <p className="font-semibold text-amber-700">Y así sucesivamente…</p>
              <p>Cada mes, dentro de los 25 días del mes siguiente</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-slate-200" />

      {/* ── GANANCIAS ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📊</div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Impuesto a las Ganancias</h2>
            <p className="text-sm text-slate-500">Impuesto nacional · AFIP · Ley N° 20.628</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">¿Qué grava?</p>
              <p className="text-sm text-slate-700">
                La <strong>ganancia neta imponible</strong> de la empresa al cierre del ejercicio fiscal:
                ingresos − costos − gastos deducibles − amortizaciones.
              </p>
              <div className="mt-2 bg-blue-50 rounded p-2 text-xs font-mono text-blue-800">
                Ganancia neta = Ingresos − Costos − Gastos
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Alícuota</p>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between bg-blue-50 rounded p-2">
                  <span>Sociedades (SA / SRL)</span>
                  <span className="font-bold text-blue-700">35%</span>
                </div>
                <p className="text-xs text-slate-500">
                  Se aplica sobre la ganancia neta del ejercicio. El ejercicio fiscal habitual cierra el <strong>31 de diciembre</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Cuándo se paga</p>
              <p className="text-sm text-slate-700 mb-1">El impuesto se abona en dos momentos:</p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex gap-2"><span className="text-blue-500">1.</span> <strong>10 anticipos mensuales</strong> durante el año</li>
                <li className="flex gap-2"><span className="text-blue-500">2.</span> <strong>Saldo final (DDJJ anual)</strong> en junio/julio</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Timeline de pagos */}
        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Calendario de pagos — ejercicio con cierre 31/12</p>
            <div className="relative">
              {/* línea horizontal */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-blue-100" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2" />
                  <p className="text-xs font-semibold text-blue-700">Ene – Oct</p>
                  <p className="text-xs text-slate-600 mt-1">10 anticipos mensuales</p>
                  <p className="text-xs text-slate-400">Cada uno = 25% del impuesto del año anterior ÷ 10</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Vence día 15 de c/mes</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <div className="w-4 h-4 bg-slate-400 rounded-full mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">31 de Dic</p>
                  <p className="text-xs text-slate-600 mt-1">Cierre del ejercicio</p>
                  <p className="text-xs text-slate-400">Se determina la ganancia neta real del año</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2" />
                  <p className="text-xs font-semibold text-green-700">Jun / Jul</p>
                  <p className="text-xs text-slate-600 mt-1">DDJJ anual</p>
                  <p className="text-xs text-slate-400">Se presenta la declaración y se paga el saldo final</p>
                  <p className="text-xs text-green-600 font-medium mt-1">Saldo = impuesto anual − anticipos pagados</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
                  <div className="w-4 h-4 bg-amber-500 rounded-full mx-auto mb-2" />
                  <p className="text-xs font-semibold text-amber-700">Si hubo exceso</p>
                  <p className="text-xs text-slate-600 mt-1">Saldo a favor</p>
                  <p className="text-xs text-slate-400">Se puede acreditar contra anticipos del año siguiente o solicitar devolución a AFIP</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Asientos contables</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">1. Devengamiento mensual (provisión)</p>
                <p className="text-xs text-slate-500 mb-1">Cada mes se estima la proporción de Ganancias que corresponde al período:</p>
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-700">Debe · 5.3.21 Impuesto a las Ganancias</span><span className="text-green-700">$ XX</span></div>
                  <div className="flex justify-between pl-4"><span className="text-slate-500">Haber · 2.1.9 Ganancias a Pagar</span><span className="text-red-600">$ XX</span></div>
                </div>
                <p className="text-xs text-slate-400 mt-1">El gasto se reconoce en el mismo mes que se generó la ganancia (principio de devengado).</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">2. Pago de anticipo mensual a AFIP</p>
                <p className="text-xs text-slate-500 mb-1">Cada uno de los 10 anticipos (día 15):</p>
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-700">Debe · 2.1.9 Ganancias a Pagar</span><span className="text-green-700">$ XX</span></div>
                  <div className="flex justify-between pl-4"><span className="text-slate-500">Haber · 1.1.2 Banco</span><span className="text-red-600">$ XX</span></div>
                </div>
                <p className="text-xs text-slate-400 mt-1">El pago reduce la deuda acumulada. Al cierre se ajusta la diferencia real.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">Ejemplo práctico</p>
          <div className="space-y-1 text-xs">
            <p>→ La empresa tuvo una ganancia neta de <strong>$ 1.000.000</strong> en el ejercicio anterior.</p>
            <p>→ Impuesto determinado: $ 1.000.000 × 35% = <strong>$ 350.000</strong></p>
            <p>→ Cada anticipo: $ 350.000 × 25% ÷ 10 = <strong>$ 8.750 / mes</strong> (10 anticipos)</p>
            <p>→ Total anticipos pagados: $ 8.750 × 10 = <strong>$ 87.500</strong></p>
            <p className="text-blue-600">→ En la DDJJ anual (junio/julio), si el impuesto real resultó $ 400.000, el saldo a pagar es: $ 400.000 − $ 87.500 = <strong>$ 312.500</strong></p>
          </div>
        </div>
      </section>

      <div className="border-t border-slate-200" />

      {/* ── Resumen Fiscal ── */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Resumen de obligaciones — PyME Misiones</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Impuesto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Organismo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Frecuencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimiento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Alícuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">Ingresos Brutos</td>
                <td className="px-4 py-3 text-slate-600">DGR Misiones</td>
                <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">Mensual</span></td>
                <td className="px-4 py-3 text-slate-600">Día 25 del mes siguiente</td>
                <td className="px-4 py-3 font-semibold text-slate-800">3%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">Ganancias — Anticipos</td>
                <td className="px-4 py-3 text-slate-600">AFIP</td>
                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">Mensual (10 cuotas)</span></td>
                <td className="px-4 py-3 text-slate-600">Día 15 de c/mes (Ene–Oct)</td>
                <td className="px-4 py-3 font-semibold text-slate-800">25% imp. anterior ÷ 10</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">Ganancias — DDJJ Anual</td>
                <td className="px-4 py-3 text-slate-600">AFIP</td>
                <td className="px-4 py-3"><span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">Anual</span></td>
                <td className="px-4 py-3 text-slate-600">Junio / Julio (año siguiente)</td>
                <td className="px-4 py-3 font-semibold text-slate-800">35% s/ganancia neta</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">IVA</td>
                <td className="px-4 py-3 text-slate-600">AFIP</td>
                <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">Mensual</span></td>
                <td className="px-4 py-3 text-slate-600">Día 20-22 del mes siguiente</td>
                <td className="px-4 py-3 font-semibold text-slate-800">21% (10.5% / 0%)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          * Los vencimientos varían según terminación de CUIT. Consultá los calendarios oficiales de AFIP y DGR Misiones para fechas exactas.
          Esta guía es educativa; no reemplaza el asesoramiento contable profesional.
        </p>
      </section>
    </div>
  )
}
