/**
 * Las alícuotas de IIBB tienen que ser IDÉNTICAS en PyMEZ y en TRIBUT.AR.
 * Si divergen, el impuesto que PyMEZ devenga en cada venta no coincide con el
 * que TRIBUT.AR liquida en la DDJJ, y la contabilidad no cierra contra la
 * declaración. Ya pasó: PyMEZ usaba 3% donde TRIBUT.AR liquidaba 3,5%.
 *
 * El catálogo de PyMEZ es una copia del de TRIBUT.AR, así que este test
 * compara contra el original publicado en GitHub. Si no hay red, se saltea.
 */
import { describe, it, expect } from 'vitest'
import { IIBB_ACTIVITIES } from '@/lib/constants/iibb-misiones'

const ORIGEN = 'https://raw.githubusercontent.com/juanjmg1436/tributar2026nuevo/main/lib/constants/misiones.ts'

function extraerActividades(fuente: string) {
  const bloque = fuente.slice(fuente.indexOf('IIBB_ACTIVITIES'), fuente.indexOf('IIBB_REGIMES'))
  const encontrados: Record<string, number> = {}
  const re = /code:\s*'([^']+)'[\s\S]{0,200}?rate:\s*([0-9.]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(bloque)) !== null) encontrados[m[1]] = Number(m[2])
  return encontrados
}

describe('catálogo de actividades IIBB', () => {
  it('no tiene códigos repetidos ni alícuotas fuera de rango', () => {
    const codigos = IIBB_ACTIVITIES.map(a => a.code)
    expect(new Set(codigos).size).toBe(codigos.length)
    for (const a of IIBB_ACTIVITIES) {
      expect(a.rate).toBeGreaterThan(0)
      expect(a.rate).toBeLessThan(0.1)
    }
  })

  it('coincide con el catálogo de TRIBUT.AR', async () => {
    let fuente: string
    try {
      const res = await fetch(ORIGEN)
      if (!res.ok) return
      fuente = await res.text()
    } catch {
      return // sin red: no se puede comparar, no se falla
    }

    const deTributar = extraerActividades(fuente)
    expect(Object.keys(deTributar).length).toBeGreaterThan(10)

    const divergencias: string[] = []
    for (const a of IIBB_ACTIVITIES) {
      const alla = deTributar[a.code]
      if (alla === undefined) divergencias.push(`${a.code} no existe en TRIBUT.AR`)
      else if (alla !== a.rate) divergencias.push(`${a.code}: PyMEZ ${a.rate} vs TRIBUT.AR ${alla}`)
    }
    expect(divergencias).toEqual([])
  })
})
