/**
 * El CUIT es lo que vincula PyMEZ con TRIBUT.AR, así que tiene que validarse
 * igual en las dos. Un typo en esta validación dejó a todos los alumnos sin
 * poder crear su perfil de contribuyente durante días.
 */
import { describe, it, expect } from 'vitest'
import { validarCuit, formatearCuit } from '@/lib/cuit'

describe('validación de CUIT', () => {
  it('acepta un CUIT válido con guiones, que es como lo muestra el campo', () => {
    expect(validarCuit('30-48414585-3').ok).toBe(true)
  })

  it('acepta el mismo CUIT sin guiones y con espacios', () => {
    expect(validarCuit('30484145853').ok).toBe(true)
    expect(validarCuit('30 48414585 3').ok).toBe(true)
  })

  it('rechaza un dígito verificador incorrecto e indica cuál corresponde', () => {
    const r = validarCuit('30-48414585-9')
    expect(r.ok).toBe(false)
    expect(r.esperado).toBe(3)
  })

  it('rechaza los incompletos sin sugerir dígito', () => {
    expect(validarCuit('30-4841458')).toEqual({ ok: false })
    expect(validarCuit('')).toEqual({ ok: false })
  })

  it('formatea a XX-XXXXXXXX-X', () => {
    expect(formatearCuit('30484145853')).toBe('30-48414585-3')
  })
})
