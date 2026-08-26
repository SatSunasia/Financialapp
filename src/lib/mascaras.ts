export function apenasNumeros(valor: string, maxDigitos: number): string {
  return valor.replace(/\D/g, '').slice(0, maxDigitos)
}

// Pra campos de valor monetário: mantém dígitos e um único ponto decimal,
// cortando no limite de caracteres pedido (ex.: 7).
export function limitarValorNumerico(valor: string, maxCaracteres: number): string {
  let limpo = valor.replace(/[^\d.]/g, '')
  const primeiroPonto = limpo.indexOf('.')
  if (primeiroPonto !== -1) {
    limpo = limpo.slice(0, primeiroPonto + 1) + limpo.slice(primeiroPonto + 1).replace(/\./g, '')
  }
  return limpo.slice(0, maxCaracteres)
}

// dd/mm/aaaa com ano travado em 4 dígitos — usar como min/max de <input type="date">.
export const DATA_MIN = '2020-01-01'
export const DATA_MAX = '2099-12-31'

// Formata progressivamente enquanto digita: até 11 dígitos vira CPF
// (000.000.000-00), de 12 a 14 vira CNPJ (00.000.000/0000-00).
export function formatarCnpjCpf(valor: string): string {
  const digitos = apenasNumeros(valor, 14)
  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digitos
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
