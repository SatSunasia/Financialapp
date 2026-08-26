export function apenasNumeros(valor: string, maxDigitos: number): string {
  return valor.replace(/\D/g, '').slice(0, maxDigitos)
}

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
