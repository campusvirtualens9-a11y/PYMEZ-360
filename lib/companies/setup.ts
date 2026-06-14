import { createClient } from '@/lib/supabase/client'
import type { BusinessSector } from '@/types'

const BASE_ACCOUNTS = [
  // ── ACTIVO CORRIENTE ── Disponibilidades ──────────────────────────────
  { code: '1.1.1',  name: 'Caja',                                    type: 'activo'     },
  { code: '1.1.2',  name: 'Banco Cuenta Corriente',                  type: 'activo'     },
  { code: '1.1.3',  name: 'Clientes / Deudores por Ventas',          type: 'activo'     },
  { code: '1.1.4',  name: 'Documentos a Cobrar',                     type: 'activo'     },
  { code: '1.1.5',  name: 'Deudores Morosos',                        type: 'activo'     },
  { code: '1.1.6',  name: 'Banco Cuenta Ahorro',                     type: 'activo'     },
  { code: '1.1.7',  name: 'Caja Chica / Fondo Fijo',                 type: 'activo'     },
  { code: '1.1.8',  name: 'Valores a Depositar',                     type: 'activo'     },
  { code: '1.1.9',  name: 'Cheques Diferidos a Cobrar',              type: 'activo'     },
  { code: '1.1.10', name: 'Inversiones Temporarias (Plazo Fijo)',     type: 'activo'     },
  { code: '1.1.11', name: 'IVA Crédito Fiscal',                      type: 'activo'     },
  { code: '1.1.12', name: 'Anticipos a Proveedores',                 type: 'activo'     },
  { code: '1.1.13', name: 'Otros Créditos Corrientes',               type: 'activo'     },
  // ── ACTIVO CORRIENTE ── Bienes de Cambio ─────────────────────────────
  { code: '1.2.1',  name: 'Mercaderías / Inventario',                type: 'activo'     },
  { code: '1.2.2',  name: 'Materias Primas',                         type: 'activo'     },
  { code: '1.2.3',  name: 'Productos en Proceso',                    type: 'activo'     },
  { code: '1.2.4',  name: 'Productos Terminados',                    type: 'activo'     },
  { code: '1.2.5',  name: 'Mercadería en Tránsito',                  type: 'activo'     },
  { code: '1.2.6',  name: 'Envases y Embalajes',                     type: 'activo'     },
  // ── ACTIVO NO CORRIENTE ── Inversiones ───────────────────────────────
  { code: '1.3.1',  name: 'Participaciones en Sociedades',           type: 'activo'     },
  { code: '1.3.2',  name: 'Plazo Fijo a Largo Plazo',                type: 'activo'     },
  { code: '1.3.3',  name: 'Deudores a Largo Plazo',                  type: 'activo'     },
  // ── ACTIVO NO CORRIENTE ── Bienes de Uso ─────────────────────────────
  { code: '1.4.1',  name: 'Terrenos',                                type: 'activo'     },
  { code: '1.4.2',  name: 'Edificios y Construcciones',              type: 'activo'     },
  { code: '1.4.3',  name: 'Maquinaria y Equipos',                    type: 'activo'     },
  { code: '1.4.4',  name: 'Muebles y Útiles',                        type: 'activo'     },
  { code: '1.4.5',  name: 'Rodados',                                 type: 'activo'     },
  { code: '1.4.6',  name: 'Equipos de Computación',                  type: 'activo'     },
  { code: '1.4.7',  name: 'Herramientas',                            type: 'activo'     },
  { code: '1.4.8',  name: 'Instalaciones',                           type: 'activo'     },
  { code: '1.4.9',  name: 'Amortización Acum. Edificios',            type: 'activo'     },
  { code: '1.4.10', name: 'Amortización Acum. Maquinaria',           type: 'activo'     },
  { code: '1.4.11', name: 'Amortización Acum. Muebles y Útiles',     type: 'activo'     },
  { code: '1.4.12', name: 'Amortización Acum. Rodados',              type: 'activo'     },
  { code: '1.4.13', name: 'Amortización Acum. Equipos Comp.',        type: 'activo'     },
  // ── ACTIVO NO CORRIENTE ── Intangibles ───────────────────────────────
  { code: '1.5.1',  name: 'Marcas y Patentes',                       type: 'activo'     },
  { code: '1.5.2',  name: 'Llave de Negocio / Fondo de Comercio',    type: 'activo'     },
  { code: '1.5.3',  name: 'Gastos de Organización y Constitución',   type: 'activo'     },
  { code: '1.5.4',  name: 'Software y Licencias',                    type: 'activo'     },
  { code: '1.5.5',  name: 'Amortización Acum. Intangibles',          type: 'activo'     },

  // ── PASIVO CORRIENTE ─────────────────────────────────────────────────
  { code: '2.1.1',  name: 'Proveedores',                             type: 'pasivo'     },
  { code: '2.1.2',  name: 'Documentos a Pagar',                      type: 'pasivo'     },
  { code: '2.1.3',  name: 'Préstamos Bancarios Corrientes',          type: 'pasivo'     },
  { code: '2.1.4',  name: 'Anticipos de Clientes',                   type: 'pasivo'     },
  { code: '2.1.5',  name: 'IVA Débito Fiscal',                       type: 'pasivo'     },
  { code: '2.1.6',  name: 'Sueldos y Jornales a Pagar',              type: 'pasivo'     },
  { code: '2.1.7',  name: 'Cargas Sociales a Pagar',                 type: 'pasivo'     },
  { code: '2.1.8',  name: 'Ingresos Brutos a Pagar',                 type: 'pasivo'     },
  { code: '2.1.9',  name: 'Impuesto a las Ganancias a Pagar',        type: 'pasivo'     },
  { code: '2.1.10', name: 'Otras Deudas Fiscales',                   type: 'pasivo'     },
  { code: '2.1.11', name: 'Alquileres a Pagar',                      type: 'pasivo'     },
  { code: '2.1.12', name: 'Honorarios a Pagar',                      type: 'pasivo'     },
  { code: '2.1.13', name: 'Acreedores Varios',                       type: 'pasivo'     },
  { code: '2.1.14', name: 'Deudas Financieras a Corto Plazo',        type: 'pasivo'     },
  { code: '2.1.15', name: 'Cheques Diferidos a Pagar',               type: 'pasivo'     },
  { code: '2.1.16', name: 'Socios / Accionistas Ctas. Corrientes',   type: 'pasivo'     },
  // ── PASIVO NO CORRIENTE ───────────────────────────────────────────────
  { code: '2.2.1',  name: 'Préstamos Bancarios No Corrientes',       type: 'pasivo'     },
  { code: '2.2.2',  name: 'Hipotecas a Pagar',                       type: 'pasivo'     },
  { code: '2.2.3',  name: 'Deudas Financieras a Largo Plazo',        type: 'pasivo'     },
  { code: '2.2.4',  name: 'Previsión para Despidos',                  type: 'pasivo'     },
  { code: '2.2.5',  name: 'Otras Previsiones',                       type: 'pasivo'     },
  { code: '2.2.6',  name: 'Ingresos Diferidos',                      type: 'pasivo'     },
  { code: '2.2.7',  name: 'Garantías Recibidas',                     type: 'pasivo'     },

  // ── PATRIMONIO NETO ───────────────────────────────────────────────────
  { code: '3.1.1',  name: 'Capital Social',                          type: 'patrimonio' },
  { code: '3.1.2',  name: 'Aportes Irrevocables (Futuros Aumentos)', type: 'patrimonio' },
  { code: '3.2.1',  name: 'Reserva Legal',                           type: 'patrimonio' },
  { code: '3.2.2',  name: 'Reserva Estatutaria',                     type: 'patrimonio' },
  { code: '3.2.3',  name: 'Reserva Facultativa',                     type: 'patrimonio' },
  { code: '3.3.1',  name: 'Resultados No Asignados (Ejercicios Ant.)',type: 'patrimonio' },
  { code: '3.3.2',  name: 'Resultado del Ejercicio',                  type: 'patrimonio' },
  { code: '3.3.3',  name: 'Dividendos en Efectivo',                  type: 'patrimonio' },

  // ── INGRESOS ─ Ventas ─────────────────────────────────────────────────
  { code: '4.1.1',  name: 'Ventas',                                  type: 'ingreso'    },
  { code: '4.1.2',  name: 'Devoluciones sobre Ventas',               type: 'ingreso'    },
  { code: '4.1.3',  name: 'Descuentos sobre Ventas',                 type: 'ingreso'    },
  { code: '4.1.4',  name: 'Ventas de Servicios',                     type: 'ingreso'    },
  { code: '4.1.5',  name: 'Intereses por Financiación de Ventas',    type: 'ingreso'    },
  // ── INGRESOS ─ Otros Ingresos ─────────────────────────────────────────
  { code: '4.2.1',  name: 'Alquileres Ganados',                      type: 'ingreso'    },
  { code: '4.2.2',  name: 'Intereses Ganados',                       type: 'ingreso'    },
  { code: '4.2.3',  name: 'Diferencia de Cambio Positiva',           type: 'ingreso'    },
  { code: '4.2.4',  name: 'Utilidad en Venta de Bienes de Uso',      type: 'ingreso'    },
  { code: '4.2.5',  name: 'Descuentos Obtenidos de Proveedores',     type: 'ingreso'    },
  { code: '4.2.6',  name: 'Comisiones Ganadas',                      type: 'ingreso'    },
  { code: '4.2.7',  name: 'Recupero de Deudas Incobrables',          type: 'ingreso'    },
  { code: '4.2.8',  name: 'Ingresos por Subsidios y Ayudas',         type: 'ingreso'    },
  { code: '4.2.9',  name: 'Otros Ingresos Varios',                   type: 'ingreso'    },

  // ── EGRESOS ─ Costo de Ventas ─────────────────────────────────────────
  { code: '5.1.1',  name: 'Costo de Mercadería Vendida',             type: 'egreso'     },
  { code: '5.1.2',  name: 'Costo de Servicios Prestados',            type: 'egreso'     },
  { code: '5.1.3',  name: 'Devoluciones sobre Compras',              type: 'egreso'     },
  { code: '5.1.4',  name: 'Descuentos sobre Compras',                type: 'egreso'     },
  // ── EGRESOS ─ Gastos de Comercialización ─────────────────────────────
  { code: '5.2.1',  name: 'Sueldos y Jornales (Comercialización)',   type: 'egreso'     },
  { code: '5.2.2',  name: 'Cargas Sociales (Comercialización)',      type: 'egreso'     },
  { code: '5.2.3',  name: 'Publicidad y Propaganda',                 type: 'egreso'     },
  { code: '5.2.4',  name: 'Fletes y Acarreos sobre Ventas',          type: 'egreso'     },
  { code: '5.2.5',  name: 'Comisiones sobre Ventas',                 type: 'egreso'     },
  { code: '5.2.6',  name: 'Embalajes y Packaging',                   type: 'egreso'     },
  { code: '5.2.7',  name: 'Viáticos y Movilidad (Comercial)',        type: 'egreso'     },
  { code: '5.2.8',  name: 'Muestras y Obsequios a Clientes',         type: 'egreso'     },
  { code: '5.2.9',  name: 'Ferias y Exposiciones',                   type: 'egreso'     },
  // ── EGRESOS ─ Gastos de Administración ───────────────────────────────
  { code: '5.3.1',  name: 'Sueldos y Jornales (Administración)',     type: 'egreso'     },
  { code: '5.3.2',  name: 'Cargas Sociales (Administración)',        type: 'egreso'     },
  { code: '5.3.3',  name: 'Alquileres y Arrendamientos',             type: 'egreso'     },
  { code: '5.3.4',  name: 'Servicios Públicos (Luz, Gas, Agua)',     type: 'egreso'     },
  { code: '5.3.5',  name: 'Telecomunicaciones e Internet',           type: 'egreso'     },
  { code: '5.3.6',  name: 'Honorarios Contables y Legales',          type: 'egreso'     },
  { code: '5.3.7',  name: 'Papelería y Útiles de Oficina',           type: 'egreso'     },
  { code: '5.3.8',  name: 'Mantenimiento y Reparaciones',            type: 'egreso'     },
  { code: '5.3.9',  name: 'Seguros',                                 type: 'egreso'     },
  { code: '5.3.10', name: 'Amortizaciones y Depreciaciones',         type: 'egreso'     },
  { code: '5.3.11', name: 'Limpieza e Higiene',                      type: 'egreso'     },
  { code: '5.3.12', name: 'Viáticos y Movilidad (Administración)',   type: 'egreso'     },
  { code: '5.3.13', name: 'Combustibles y Lubricantes',              type: 'egreso'     },
  { code: '5.3.14', name: 'Impuesto a los Ingresos Brutos',          type: 'egreso'     },
  { code: '5.3.15', name: 'Sellos e Impuestos Menores',              type: 'egreso'     },
  { code: '5.3.16', name: 'Gastos Varios de Administración',         type: 'egreso'     },
  { code: '5.3.17', name: 'Indemnizaciones y Liquidaciones',         type: 'egreso'     },
  { code: '5.3.18', name: 'Capacitación y Formación del Personal',   type: 'egreso'     },
  { code: '5.3.19', name: 'Insumos Informáticos',                    type: 'egreso'     },
  { code: '5.3.20', name: 'Gastos de Seguridad',                     type: 'egreso'     },
  // ── EGRESOS ─ Gastos Financieros ─────────────────────────────────────
  { code: '5.4.1',  name: 'Intereses Pagados',                       type: 'egreso'     },
  { code: '5.4.2',  name: 'Descuentos Concedidos a Clientes',        type: 'egreso'     },
  { code: '5.4.3',  name: 'Diferencia de Cambio Negativa',           type: 'egreso'     },
  { code: '5.4.4',  name: 'Gastos Bancarios',                        type: 'egreso'     },
  { code: '5.4.5',  name: 'Comisiones y Gastos de Tarjetas',         type: 'egreso'     },
  { code: '5.4.6',  name: 'Pérdida en Venta de Inversiones',         type: 'egreso'     },
  { code: '5.4.7',  name: 'Multas e Intereses por Mora',             type: 'egreso'     },
]

const SECTOR_PRODUCTS: Record<BusinessSector, Array<{
  code: string; name: string; category: string
  unit: string; cost_price: number; sale_price: number; stock_current: number; stock_min: number
}>> = {
  comercial: [
    { code: 'P001', name: 'Yerba 500g',          category: 'Almacén',   unit: 'kg',   cost_price: 800,   sale_price: 1200,  stock_current: 50,  stock_min: 10 },
    { code: 'P002', name: 'Arroz 1kg',            category: 'Almacén',   unit: 'kg',   cost_price: 600,   sale_price: 900,   stock_current: 80,  stock_min: 15 },
    { code: 'P003', name: 'Gaseosa 1.5L',         category: 'Bebidas',   unit: 'un',   cost_price: 700,   sale_price: 1100,  stock_current: 60,  stock_min: 12 },
    { code: 'P004', name: 'Detergente 1L',        category: 'Limpieza',  unit: 'un',   cost_price: 900,   sale_price: 1400,  stock_current: 30,  stock_min: 8  },
    { code: 'P005', name: 'Harina 1kg',           category: 'Almacén',   unit: 'kg',   cost_price: 500,   sale_price: 750,   stock_current: 100, stock_min: 20 },
    { code: 'P006', name: 'Aceite 1L',            category: 'Almacén',   unit: 'L',    cost_price: 1100,  sale_price: 1600,  stock_current: 45,  stock_min: 10 },
    { code: 'P007', name: 'Azúcar 1kg',           category: 'Almacén',   unit: 'kg',   cost_price: 550,   sale_price: 820,   stock_current: 70,  stock_min: 15 },
    { code: 'P008', name: 'Fideos 500g',          category: 'Almacén',   unit: 'un',   cost_price: 400,   sale_price: 600,   stock_current: 90,  stock_min: 20 },
    { code: 'P009', name: 'Jabón 230g',           category: 'Limpieza',  unit: 'un',   cost_price: 350,   sale_price: 550,   stock_current: 40,  stock_min: 10 },
    { code: 'P010', name: 'Leche 1L',             category: 'Lácteos',   unit: 'L',    cost_price: 900,   sale_price: 1350,  stock_current: 30,  stock_min: 8  },
  ],
  construccion: [
    { code: 'M001', name: 'Cemento 50kg',         category: 'Materiales',unit: 'bolsa',cost_price: 4500,  sale_price: 6500,  stock_current: 20,  stock_min: 5  },
    { code: 'M002', name: 'Arena 1m³',            category: 'Materiales',unit: 'm3',   cost_price: 8000,  sale_price: 11000, stock_current: 10,  stock_min: 3  },
    { code: 'M003', name: 'Hierro 12mm x6m',      category: 'Materiales',unit: 'vara', cost_price: 3500,  sale_price: 5000,  stock_current: 30,  stock_min: 8  },
    { code: 'M004', name: 'Ladrillo común x1000', category: 'Materiales',unit: 'millar',cost_price:25000, sale_price:35000,  stock_current: 5,   stock_min: 2  },
    { code: 'M005', name: 'Pintura látex 20L',    category: 'Pintura',   unit: 'balde',cost_price: 9000,  sale_price: 13000, stock_current: 15,  stock_min: 4  },
  ],
  salud: [
    { code: 'S001', name: 'Consulta médica',      category: 'Servicios', unit: 'un',   cost_price: 0,     sale_price: 8000,  stock_current: 999, stock_min: 0  },
    { code: 'S002', name: 'Guantes descartables', category: 'Insumos',   unit: 'caja', cost_price: 2000,  sale_price: 3500,  stock_current: 20,  stock_min: 5  },
    { code: 'S003', name: 'Vendas',               category: 'Insumos',   unit: 'un',   cost_price: 300,   sale_price: 600,   stock_current: 50,  stock_min: 10 },
  ],
  gastronomia: [
    { code: 'G001', name: 'Empanada (doc)',        category: 'Platos',   unit: 'doc',  cost_price: 2000,  sale_price: 4500,  stock_current: 10,  stock_min: 2  },
    { code: 'G002', name: 'Menú del día',          category: 'Platos',   unit: 'un',   cost_price: 1500,  sale_price: 3500,  stock_current: 20,  stock_min: 5  },
    { code: 'G003', name: 'Gaseosa 500ml',         category: 'Bebidas',  unit: 'un',   cost_price: 500,   sale_price: 1200,  stock_current: 48,  stock_min: 12 },
    { code: 'G004', name: 'Harina 25kg',           category: 'Insumos',  unit: 'bolsa',cost_price: 3500,  sale_price: 0,     stock_current: 5,   stock_min: 2  },
  ],
  transporte: [
    { code: 'T001', name: 'Flete local',           category: 'Servicios',unit: 'viaje',cost_price: 5000,  sale_price: 12000, stock_current: 999, stock_min: 0  },
    { code: 'T002', name: 'Viaje interurbano',     category: 'Servicios',unit: 'viaje',cost_price: 15000, sale_price: 35000, stock_current: 999, stock_min: 0  },
    { code: 'T003', name: 'Combustible (litros)',  category: 'Gastos',   unit: 'L',    cost_price: 1200,  sale_price: 0,     stock_current: 200, stock_min: 50 },
  ],
}

export async function setupCompany(params: {
  companyId: string
  sector: BusinessSector
  initialCash?: number
  initialBank?: number
}): Promise<void> {
  const supabase = createClient()

  // Plan de cuentas
  await supabase.from('chart_of_accounts').insert(
    BASE_ACCOUNTS.map((a) => ({ ...a, company_id: params.companyId }))
  )

  // Caja inicial
  const { data: cajaAcc } = await supabase
    .from('cash_accounts')
    .insert({ company_id: params.companyId, name: 'Caja Principal', type: 'caja', balance: params.initialCash ?? 50000 })
    .select('id')
    .single()

  // Banco inicial
  const { data: bancoAcc } = await supabase
    .from('cash_accounts')
    .insert({ company_id: params.companyId, name: 'Banco Nación', type: 'banco', balance: params.initialBank ?? 100000 })
    .select('id')
    .single()

  // Productos según rubro
  const products = SECTOR_PRODUCTS[params.sector] ?? SECTOR_PRODUCTS.comercial
  await supabase.from('products').insert(
    products.map((p) => ({ ...p, company_id: params.companyId }))
  )

  // Clientes demo
  await supabase.from('customers').insert([
    { company_id: params.companyId, name: 'Cliente Demo 1',   email: 'cliente1@demo.com', balance: 0 },
    { company_id: params.companyId, name: 'Cliente Demo 2',   email: 'cliente2@demo.com', balance: 0 },
    { company_id: params.companyId, name: 'Consumidor Final', email: 'cf@demo.com',        balance: 0 },
  ])

  // Proveedores demo
  await supabase.from('suppliers').insert([
    { company_id: params.companyId, name: 'Distribuidora Central', email: 'central@proveedor.com', balance: 0 },
    { company_id: params.companyId, name: 'Mayorista del Norte',   email: 'norte@mayorista.com',   balance: 0 },
  ])
}
