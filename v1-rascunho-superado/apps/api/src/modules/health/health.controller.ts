import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "../../platform/security/public.decorator.ts";
import { DatabaseService } from "../../platform/database/database.service.ts";

@Controller()
export class HealthController {
  public constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  @Public()
  @Get("health")
  public async health(): Promise<{ status: string; db: string }> {
    try {
      await this.db.query("SELECT 1");
      return { status: "ok", db: "up" };
    } catch {
      return { status: "degraded", db: "down" };
    }
  }
}
