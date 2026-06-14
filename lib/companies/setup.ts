import { createClient } from '@/lib/supabase/client'
import type { BusinessSector } from '@/types'

const BASE_ACCOUNTS = [
  { code: '1.1.1', name: 'Caja',                        type: 'activo'     },
  { code: '1.1.2', name: 'Banco',                       type: 'activo'     },
  { code: '1.1.3', name: 'Clientes',                    type: 'activo'     },
  { code: '1.2.1', name: 'Mercaderías / Inventario',    type: 'activo'     },
  { code: '2.1.1', name: 'Proveedores',                 type: 'pasivo'     },
  { code: '3.1.1', name: 'Capital',                     type: 'patrimonio' },
  { code: '4.1.1', name: 'Ventas',                      type: 'ingreso'    },
  { code: '5.1.1', name: 'Costo de Mercadería Vendida', type: 'egreso'     },
  { code: '5.1.2', name: 'Gastos Generales',            type: 'egreso'     },
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
