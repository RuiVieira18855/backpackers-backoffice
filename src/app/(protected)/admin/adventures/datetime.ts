/**
 * Datas das caminhadas: o formulário trabalha em hora de Portugal continental
 * (é a que o participante lê no site) e a base de dados guarda instantes UTC.
 * O servidor corre em UTC, por isso a conversão tem de ser explícita — sem
 * ela, um evento de Verão ficava uma hora adiantado.
 *
 * Ambas as funções são exactas excepto dentro da hora em que muda a hora legal.
 */

const TZ = "Europe/Lisbon";

function offsetAt(instant: Date): number {
  const local = new Date(instant.toLocaleString("en-US", { timeZone: TZ }));
  const utc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return local.getTime() - utc.getTime();
}

/** Valor de <input type="datetime-local"> ("2026-10-11T09:00") para instante. */
export function fromLisbonLocal(value: string): Date | null {
  if (!value) return null;
  const asUtc = new Date(`${value.length === 16 ? `${value}:00` : value}Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  return new Date(asUtc.getTime() - offsetAt(asUtc));
}

/** Instante para o valor que <input type="datetime-local"> espera. */
export function toLisbonLocalInput(date: Date | null): string {
  if (!date) return "";
  const shifted = new Date(date.getTime() + offsetAt(date));
  return shifted.toISOString().slice(0, 16);
}
