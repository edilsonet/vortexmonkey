/**
 * Peso e balanceamento (W&B).
 *
 * Portado do MyTailLog (MIT). A identidade fundamental e momento = peso x braco:
 * dados dois dos tres, o terceiro e derivado. As alteracoes de equipamento
 * registradas DEPOIS da ultima revisao de W&B sao a "lacuna de registro": o
 * peso atual pode nao refleti-las.
 *
 * ATENCAO REGULATORIA: este modulo calcula. A emissao do W&B assinado e ato do
 * responsavel tecnico; o VORTEX apenas prepara e sinaliza inconsistencias.
 */

export interface WBTriple {
  readonly weight: number | null;
  readonly arm: number | null;
  readonly moment: number | null;
}

export type EquipChangeKind = 'install' | 'removal';

export interface EquipChange {
  readonly name: string;
  readonly date: string;
  readonly kind: EquipChangeKind;
}

export type WBStatus = 'ok' | 'incomplete' | 'stale';

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Preenche o unico valor ausente de peso/braco/momento a partir dos outros dois.
 * Pesos com 2 casas; braco com 3 (polegadas sao sensiveis); momento com 2.
 * Divisao por zero nao e tentada: o valor permanece nulo.
 */
export function completeWB({ weight, arm, moment }: WBTriple): WBTriple {
  if (weight != null && arm != null && moment == null) {
    return { weight, arm, moment: round(weight * arm, 2) };
  }
  if (weight != null && moment != null && arm == null && weight !== 0) {
    return { weight, arm: round(moment / weight, 3), moment };
  }
  if (arm != null && moment != null && weight == null && arm !== 0) {
    return { weight: round(moment / arm, 2), arm, moment };
  }
  return { weight, arm, moment };
}

/** Carga util = peso maximo de decolagem menos peso vazio, quando ambos existem. */
export function usefulLoad(emptyWeight: number | null, maxGross: number | null): number | null {
  if (emptyWeight == null || maxGross == null) return null;
  return round(maxGross - emptyWeight, 2);
}

/**
 * Alteracoes de equipamento registradas estritamente DEPOIS da ultima revisao
 * de W&B (ou todas, se nao houver W&B registrado). Ordenadas da mais recente
 * para a mais antiga para virar fila de tratamento.
 */
export function staleWBChanges(
  latestWBDate: string | null,
  changes: readonly EquipChange[],
): EquipChange[] {
  const after =
    latestWBDate == null ? [...changes] : changes.filter((c) => c.date > latestWBDate);
  return after.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Avaliacao do registro de W&B de uma aeronave. `incomplete` quando falta algum
 * dos tres valores basicos; `stale` quando ha alteracao de equipamento nao
 * refletida; `ok` caso contrario.
 */
export function assessWB(input: {
  readonly triple: WBTriple;
  readonly latestWBDate: string | null;
  readonly changes: readonly EquipChange[];
}): { readonly status: WBStatus; readonly missing: readonly (keyof WBTriple)[]; readonly staleChanges: readonly EquipChange[] } {
  const missing: (keyof WBTriple)[] = [];
  if (input.triple.weight == null) missing.push('weight');
  if (input.triple.arm == null) missing.push('arm');
  if (input.triple.moment == null) missing.push('moment');

  const stale = staleWBChanges(input.latestWBDate, input.changes);
  const status: WBStatus =
    missing.length > 0 ? 'incomplete' : stale.length > 0 ? 'stale' : 'ok';
  return { status, missing, staleChanges: stale };
}
