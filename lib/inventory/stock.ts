import { createClient } from '@/lib/supabase/client'

export async function updateStock(params: {
  companyId: string
  productId: string
  type: 'entrada' | 'salida' | 'ajuste'
  quantity: number
  unitCost?: number
  reason?: string
  referenceType?: string
  referenceId?: string
  createdBy?: string
}): Promise<{ success: boolean; newStock: number | null; error?: string }> {
  const supabase = createClient()

  const { data: product, error: prodError } = await supabase
    .from('products')
    .select('stock_current, cost_price')
    .eq('id', params.productId)
    .single()

  if (prodError || !product) {
    return { success: false, newStock: null, error: 'Producto no encontrado' }
  }

  let newStock: number
  if (params.type === 'entrada') {
    newStock = Number(product.stock_current) + params.quantity
  } else if (params.type === 'salida') {
    newStock = Number(product.stock_current) - params.quantity
    if (newStock < 0) {
      return { success: false, newStock: null, error: 'Stock insuficiente' }
    }
  } else {
    // ajuste: el quantity es el nuevo valor absoluto
    newStock = params.quantity
  }

  const { error: stockError } = await supabase
    .from('products')
    .update({ stock_current: newStock })
    .eq('id', params.productId)

  if (stockError) {
    return { success: false, newStock: null, error: stockError.message }
  }

  await supabase.from('stock_movements').insert({
    company_id: params.companyId,
    product_id: params.productId,
    date: new Date().toISOString().split('T')[0],
    type: params.type,
    quantity: params.quantity,
    unit_cost: params.unitCost ?? Number(product.cost_price),
    reason: params.reason,
    reference_type: params.referenceType,
    reference_id: params.referenceId ?? null,
    created_by: params.createdBy ?? null,
  })

  return { success: true, newStock }
}

export async function getLowStockProducts(companyId: string) {
  const supabase = createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, code, name, stock_current, stock_min, unit')
    .eq('company_id', companyId)

  return (products ?? []).filter(
    (p) => Number(p.stock_current) <= Number(p.stock_min)
  )
}
