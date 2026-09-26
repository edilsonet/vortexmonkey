import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../platform/database/database.service';

@Injectable()
export class RegulatoryParameterService {
  public constructor(private readonly database: DatabaseService) {}
  public async getNumber(key: string, at = new Date()): Promise<number> {
    const result = await this.database.query<{ value: number }>(`SELECT value::text::numeric AS value FROM compliance.regulatory_parameters WHERE key = $1 AND effective_from <= $2::date AND (effective_until IS NULL OR effective_until >= $2::date) ORDER BY version DESC LIMIT 1`, [key, at]);
    const value = result.rows[0]?.value;
    if (value === undefined) throw new NotFoundException({ code: 'NOT_FOUND', message: `Parâmetro regulatório não encontrado: ${key}` });
    return Number(value);
  }
}
