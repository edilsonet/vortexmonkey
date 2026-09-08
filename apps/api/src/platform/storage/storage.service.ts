import { Injectable } from "@nestjs/common";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "@vortex/config";

@Injectable()
export class StorageService {
  private readonly dir = path.join(process.cwd(), ".secrets", "objects");

  public constructor() {
    mkdirSync(this.dir, { recursive: true });
  }

  public async putObject(key: string, body: Buffer | string): Promise<void> {
    const full = path.join(this.dir, key.replaceAll("/", "__"));
    writeFileSync(full, body);
  }

  public async getObject(key: string): Promise<Buffer | null> {
    const full = path.join(this.dir, key.replaceAll("/", "__"));
    if (!existsSync(full)) return null;
    return readFileSync(full);
  }

  public async presignedPutUrl(key: string): Promise<{ url: string; expiresIn: number }> {
    void loadConfig();
    return { url: `/api/documents/storage/${encodeURIComponent(key)}`, expiresIn: 300 };
  }

  public async presignedGetUrl(key: string): Promise<{ url: string; expiresIn: number }> {
    return { url: `/api/documents/storage/${encodeURIComponent(key)}?dl=1`, expiresIn: 300 };
  }
}
