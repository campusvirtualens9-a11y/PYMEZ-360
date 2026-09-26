/**
 * Catálogo de actividades e IIBB de Misiones — espejo de TRIBUT.AR.
 *
 * Copiado literalmente de `lib/constants/misiones.ts` del simulador TRIBUT.AR
 * para que la alícuota con la que PyMEZ 360 devenga el impuesto en cada venta
 * sea exactamente la que TRIBUT.AR usa al liquidar la DDJJ ante ATM. Antes
 * PyMEZ elegía la alícuota por provincia (Misiones = 3% para toda actividad),
 * de modo que un comercio de artículos del hogar devengaba al 3% y liquidaba
 * al 3,5%, y la contabilidad no cerraba contra la declaración jurada.
 *
 * Si cambian las alícuotas en TRIBUT.AR, hay que replicarlas acá.
 */

export interface IIBBActivity {
  code: string
  name: string
  /** Alícuota general en decimales */
  rate: number
  /** Alícuota reducida (si aplica) */
  reducedRate?: number
  category: 'comercio' | 'industria' | 'servicios' | 'primario' | 'construccion'
  description: string
}

export const IIBB_ACTIVITIES: IIBBActivity[] = [
  // ── SERVICIOS ──
  {
    code: '741000',
    name: 'Actividades jurídicas y notariales',
    rate: 0.04,
    category: 'servicios',
    description: 'Estudios jurídicos, escribanías',
  },
  {
    code: '742000',
    name: 'Actividades de contabilidad y auditoría',
    rate: 0.035,
    category: 'servicios',
    description: 'Estudios contables, asesoría impositiva',
  },
  {
    code: '743000',
    name: 'Consultoría de gestión empresarial',
    rate: 0.035,
    category: 'servicios',
    description: 'Consultoría en administración de empresas',
  },
  {
    code: '726000',
    name: 'Servicios informáticos',
    rate: 0.03,
    reducedRate: 0.015,
    category: 'servicios',
    description: 'Desarrollo de software, hosting, soporte IT',
  },
  {
    code: '800000',
    name: 'Enseñanza',
    rate: 0.025,
    category: 'servicios',
    description: 'Institutos educativos privados, academias',
  },
  {
    code: '851000',
    name: 'Actividades relacionadas con la salud',
    rate: 0.03,
    category: 'servicios',
    description: 'Consultorios médicos, odontológicos, clínicas',
  },
  {
    code: '630000',
    name: 'Transporte y logística',
    rate: 0.035,
    category: 'servicios',
    description: 'Transporte de cargas y pasajeros',
  },
  {
    code: '931000',
    name: 'Hotelería y alojamiento',
    rate: 0.04,
    category: 'servicios',
    description: 'Hoteles, hosterías, alojamientos turísticos',
  },
  {
    code: '553000',
    name: 'Restaurantes y bares',
    rate: 0.04,
    category: 'servicios',
    description: 'Gastronomía, restaurantes, cafeterías',
  },
  {
    code: '930000',
    name: 'Turismo y esparcimiento',
    rate: 0.04,
    category: 'servicios',
    description: 'Agencias de viajes, turismo aventura',
  },
  // ── COMERCIO ──
  {
    code: '521000',
    name: 'Comercio minorista — alimentos y bebidas',
    rate: 0.03,
    category: 'comercio',
    description: 'Almacenes, supermercados, dietéticas',
  },
  {
    code: '524000',
    name: 'Comercio minorista — indumentaria y calzado',
    rate: 0.035,
    category: 'comercio',
    description: 'Ropa, calzado, accesorios',
  },
  {
    code: '526000',
    name: 'Comercio minorista — artículos del hogar',
    rate: 0.035,
    category: 'comercio',
    description: 'Electrodomésticos, muebles, ferretería',
  },
  {
    code: '511000',
    name: 'Comercio mayorista',
    rate: 0.03,
    category: 'comercio',
    description: 'Venta al por mayor',
  },
  {
    code: '504000',
    name: 'Venta de vehículos y repuestos',
    rate: 0.03,
    category: 'comercio',
    description: 'Concesionarias, lubricentros, repuestos',
  },
  {
    code: '505000',
    name: 'Venta de combustibles',
    rate: 0.015,
    category: 'comercio',
    description: 'Estaciones de servicio',
  },
  // ── INDUSTRIA ──
  {
    code: '153000',
    name: 'Elaboración de productos alimenticios',
    rate: 0.015,
    reducedRate: 0.01,
    category: 'industria',
    description: 'Fábricas de alimentos y bebidas',
  },
  {
    code: '202000',
    name: 'Industria maderera y aserraderos',
    rate: 0.015,
    category: 'industria',
    description: 'Aserraderos, carpinterías industriales',
  },
  {
    code: '281000',
    name: 'Fabricación de productos metálicos',
    rate: 0.015,
    category: 'industria',
    description: 'Metalúrgica, herrería industrial',
  },
  // ── PRIMARIO ──
  {
    code: '011000',
    name: 'Producción agrícola — yerba mate y té',
    rate: 0.01,
    category: 'primario',
    description: 'Chacras yerbateras y tealeras',
  },
  {
    code: '012000',
    name: 'Producción forestal y extracción de madera',
    rate: 0.01,
    category: 'primario',
    description: 'Bosques implantados, extracción forestal',
  },
  {
    code: '013000',
    name: 'Ganadería y producción animal',
    rate: 0.01,
    category: 'primario',
    description: 'Ganadería bovina, avicultura, apicultura',
  },
  // ── CONSTRUCCIÓN ──
  {
    code: '452000',
    name: 'Construcción de edificios y obras civiles',
    rate: 0.03,
    category: 'construccion',
    description: 'Empresas constructoras, arquitectos, ingenieros',
  },
  {
    code: '453000',
    name: 'Instalaciones eléctricas y sanitarias',
    rate: 0.03,
    category: 'construccion',
    description: 'Electricistas, plomeros, gasistas matriculados',
  },
]
export const IIBB_REGIMES = [
  {
    value: 'local',
    label: 'Local (Contribuyente directo Misiones)',
    description: 'Actividad exclusivamente en Misiones',
  },
  {
    value: 'convenio_multilateral',
    label: 'Convenio Multilateral',
    description: 'Actividad en 2 o más provincias — se declara en COMARB',
  },
  {
    value: 'exento',
    label: 'Exento',
    description: 'Actividad exenta por ley provincial',
  },
]

// ── Categorías para agrupar el desplegable de actividades ────────────────────
export const ACTIVITY_CATEGORIES: { key: IIBBActivity['category']; label: string }[] = [
  { key: 'comercio',     label: 'Comercio' },
  { key: 'servicios',    label: 'Servicios' },
  { key: 'industria',    label: 'Industria' },
  { key: 'construccion', label: 'Construcción' },
  { key: 'primario',     label: 'Actividad primaria' },
]

/**
 * Qué actividad tiene una empresa.
 *
 * Hasta septiembre de 2026 sólo se guardaba la alícuota y la actividad se
 * deducía al revés, buscando la primera del catálogo que la tuviera. Eso
 * acierta poco: las 24 actividades se agrupan en apenas 6 alícuotas, así que
 * 20 de ellas comparten alícuota con alguna otra y la ficha de la empresa
 * mostraba un rubro que no era el elegido.
 *
 * Ahora `companies.iibb_activity_code` guarda el código. Cuando está, es la
 * respuesta definitiva. Cuando falta — empresas creadas antes de la columna —
 * se sigue sugiriendo por alícuota, pero marcado como no confirmado para no
 * afirmar algo que no se sabe.
 */
export function resolverActividad(
  code: string | null | undefined,
  rate: number | null | undefined,
): { actividad: IIBBActivity | null; confirmada: boolean } {
  if (code) {
    const exacta = IIBB_ACTIVITIES.find(a => a.code === code)
    if (exacta) return { actividad: exacta, confirmada: true }
  }
  const porAlicuota = IIBB_ACTIVITIES.find(a => a.rate === Number(rate))
  return { actividad: porAlicuota ?? null, confirmada: false }
}
