/**
 * Qué actividad de IIBB tiene una empresa.
 *
 * El problema que esto cierra: sólo se guardaba la alícuota, y como las 24
 * actividades del catálogo de ATM se agrupan en 6 alícuotas, deducir la
 * actividad desde la alícuota devuelve la actividad equivocada en 20 de los
 * 24 casos. El impuesto salía bien —la alícuota es la correcta— pero la ficha
 * de la empresa mostraba otro rubro.
 */
import { describe, it, expect } from 'vitest'
import { IIBB_ACTIVITIES, resolverActividad } from '@/lib/constants/iibb-misiones'

describe('actividad de IIBB de una empresa', () => {
  it('con el código guardado devuelve exactamente esa actividad', () => {
    for (const a of IIBB_ACTIVITIES) {
      const r = resolverActividad(a.code, a.rate)
      expect(r.actividad?.code).toBe(a.code)
      expect(r.confirmada).toBe(true)
    }
  })

  it('distingue dos actividades que comparten alícuota', () => {
    const mismos = IIBB_ACTIVITIES.filter(a => a.rate === 0.03)
    expect(mismos.length).toBeGreaterThan(1)
    const [uno, otro] = mismos
    expect(resolverActividad(uno.code, 0.03).actividad?.code).toBe(uno.code)
    expect(resolverActividad(otro.code, 0.03).actividad?.code).toBe(otro.code)
  })

  it('sin código sugiere por alícuota pero no lo da por confirmado', () => {
    const r = resolverActividad(null, 0.03)
    expect(r.actividad?.rate).toBe(0.03)
    expect(r.confirmada).toBe(false)
  })

  it('el código manda aunque la alícuota guardada esté desactualizada', () => {
    const a = IIBB_ACTIVITIES.find(x => x.rate === 0.04)!
    const r = resolverActividad(a.code, 0.015)
    expect(r.actividad?.code).toBe(a.code)
    expect(r.confirmada).toBe(true)
  })

  it('un código que ya no existe en el catálogo no rompe: cae a la sugerencia', () => {
    const r = resolverActividad('999999', 0.035)
    expect(r.actividad?.rate).toBe(0.035)
    expect(r.confirmada).toBe(false)
  })

  it('sin actividad gravada no devuelve ninguna', () => {
    expect(resolverActividad(null, 0).actividad).toBeNull()
  })
})
