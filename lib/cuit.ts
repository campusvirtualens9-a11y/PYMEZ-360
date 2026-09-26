/**
 * Validación de CUIT compartida por la app.
 * Mismo control que hace ARCA: 11 dígitos y dígito verificador correcto.
 * Vive acá, y no dentro de un componente, para poder testearla.
 */
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

export function validarCuit(valor: string): { ok: boolean; esperado?: number } {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 11) return { ok: false }
  const suma = d.slice(0, 10).split('').reduce((acc, n, i) => acc + Number(n) * PESOS[i], 0)
  const resto = suma % 11
  const esperado = resto === 0 ? 0 : 11 - resto
  return { ok: esperado === Number(d[10]), esperado }
}

export function formatearCuit(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}
