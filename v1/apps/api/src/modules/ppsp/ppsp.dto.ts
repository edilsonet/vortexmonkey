import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { ArsoFunction, ToxicologicalResult } from '@vortex/contracts-be';

export class RegisterArsoDto {
  @IsUUID()
  userId!: string;

  @IsEnum([
    'PILOTO_COMANDO',
    'COPILOTO',
    'COMISSARIO_VOO',
    'MECANICO_VOO',
    'MECANICO_MANUTENCAO_AERONAUTICA',
    'DESPACHANTE_OPERACIONAL_VOO',
    'OPERADOR_TRATOR_RAMPA_AEROPORTO',
    'AGENTE_PROTECAO_AVSEC',
  ])
  arsoFunction!: ArsoFunction;
}

export class LogToxicologicalExamDto {
  @IsUUID()
  arsoPersonnelId!: string;

  @IsDateString()
  examDate!: string;

  @IsEnum(['NEGATIVO', 'POSITIVO', 'INCONCLUSIVO'])
  result!: ToxicologicalResult;

  @IsString()
  @MaxLength(255)
  laboratory!: string;

  @IsString()
  @MaxLength(64)
  reportHash!: string;

  @IsBoolean()
  @IsOptional()
  isRandomSample?: boolean;
}

export class TriggerRandomTestDto {
  @IsOptional()
  @IsString()
  justification?: string;
}
