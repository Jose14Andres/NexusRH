import { validarCedula, maskCedula } from '../../../lib/cedula';

describe('validarCedula', () => {
  // Cédulas válidas conocidas
  it('acepta cédula de Pichincha (1710034065)', () => {
    expect(validarCedula('1710034065')).toBe(true);
  });

  it('acepta cédula de Guayaquil (0926687856)', () => {
    expect(validarCedula('0926687856')).toBe(true);
  });

  it('acepta cédula con dígito verificador = 0 (0190000000)', () => {
    // suma de productos ajustados = 10 → residuo 0 → verificador 0
    expect(validarCedula('0190000000')).toBe(true);
  });

  // Dígito verificador incorrecto
  it('rechaza dígito verificador incorrecto', () => {
    expect(validarCedula('1710034066')).toBe(false);
  });

  // Provincia fuera de rango
  it('rechaza provincia > 24', () => {
    expect(validarCedula('2510034065')).toBe(false);
  });

  it('rechaza provincia = 00', () => {
    expect(validarCedula('0010034065')).toBe(false);
  });

  // Formato inválido
  it('rechaza longitud distinta de 10', () => {
    expect(validarCedula('171003406')).toBe(false);
    expect(validarCedula('17100340650')).toBe(false);
  });

  it('rechaza caracteres no numéricos', () => {
    expect(validarCedula('12345abcde')).toBe(false);
  });

  it('rechaza cadena vacía', () => {
    expect(validarCedula('')).toBe(false);
  });
});

describe('maskCedula', () => {
  it('oculta los dígitos centrales', () => {
    expect(maskCedula('1710034065')).toBe('171****065');
  });

  it('preserva los 3 primeros y 3 últimos dígitos', () => {
    const masked = maskCedula('0926687856');
    expect(masked.startsWith('092')).toBe(true);
    expect(masked.endsWith('856')).toBe(true);
  });
});
