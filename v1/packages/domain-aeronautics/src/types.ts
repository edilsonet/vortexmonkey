/**
 * Tipos do motor de aeronavegabilidade do VORTEX.
 *
 * Esta lib e PURA: nao depende de NestJS, banco, HTTP nem de nenhum framework.
 * Recebe dados ja carregados e devolve calculos. Assim serve tanto ao backend
 * NestJS do monorepo v1 quanto as libs do workspace Nx (v4).
 */

/** Medidores de tempo de aeronave. */
export type Meter = 'tach' | 'hobbs' | 'airframe';

/** Medidores admitidos em projecao de utilizacao (celula excluida: sem relacao fixa). */
export type UtilizationMeter = Extract<Meter, 'tach' | 'hobbs'>;

/** Leitura de medidor registrada em uma data. */
export interface MeterReading {
  readonly date: string;
  readonly tach?: number | null;
  readonly hobbs?: number | null;
  readonly airframe?: number | null;
  readonly estimated?: boolean;
}

/** Substituicao declarada de medidor: a partir de `resetDate` vale a nova escala. */
export interface MeterReset {
  readonly meter: UtilizationMeter;
  readonly resetDate: string;
}

/** Intervalo regulatório ou de plano de manutencao. */
export interface Interval {
  readonly months?: number | null;
  readonly hours?: number | null;
  readonly cycles?: number | null;
}

/**
 * Como contar o intervalo em meses:
 * - `exact`    -> meses corridos exatos a partir da data;
 * - `calendar` -> ultimo dia do mes de vencimento (padrao "meses-calendario");
 * - `days30`   -> janela fixa de 30 dias.
 */
export type MonthCounting = 'exact' | 'calendar' | 'days30';

/** Item recorrente de conformidade (inspecao, DA, revisao, componente). */
export interface ComplianceItem {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly regulatory: boolean;
  readonly interval: Interval;
  readonly monthCounting: MonthCounting;
  readonly meter: Meter | null;
  readonly lastDoneDate: string | null;
  readonly lastDoneHours: number | null;
  readonly lastDoneCycles: number | null;
  readonly nextDueDate: string | null;
  readonly nextDueHours: number | null;
  readonly nextDueCycles: number | null;
  readonly notes: string | null;
}

/** Proximo vencimento calculado. */
export interface NextDue {
  readonly date: string | null;
  readonly hours: number | null;
  readonly cycles: number | null;
}

/** Urgencia de um item frente ao vencimento. */
export type Urgency = 'overdue' | 'due_soon' | 'upcoming' | 'none';

/** Confianca de um calculo derivado de amostras. */
export type Confidence = 'high' | 'medium' | 'low' | 'none';

/** Regra de reset cruzado entre itens (ex.: inspecao periodica resetada por revisao geral). */
export interface ResetRule {
  readonly adjustedKind: string;
  readonly adjustedByKind: string;
}

/** Limiares de antecedencia para urgencia. */
export interface UrgencyThresholds {
  readonly dueSoonDays: number;
  readonly dueSoonHours: number;
  readonly dueSoonCycles: number;
}

/** Recorte de severidade usado pelo Hub de Alertas Preditivos. */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING';
