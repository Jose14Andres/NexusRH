export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const prov = parseInt(cedula.substring(0, 2), 10);
  if (prov < 1 || prov > 24) return false;
  const digits = cedula.split('').map(Number);
  const verificador = digits[9];
  const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const suma = coefs.reduce((acc, c, i) => {
    let v = c * digits[i];
    if (v >= 10) v -= 9;
    return acc + v;
  }, 0);
  const residuo = suma % 10;
  return (residuo === 0 ? 0 : 10 - residuo) === verificador;
}

export function maskCedula(cedula: string): string {
  return `${cedula.slice(0, 3)}****${cedula.slice(-3)}`;
}
