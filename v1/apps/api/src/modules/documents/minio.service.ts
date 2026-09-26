import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readSecret } from '@vortex/config';
import { Client as MinioClient } from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);

  private readonly client = new MinioClient({
    endPoint: process.env.MINIO_HOST ?? '127.0.0.1',
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'vortex',
    secretKey: readSecret('MINIO_SECRET_KEY_FILE', 'MINIO_SECRET_KEY'),
  });

  public readonly bucket = process.env.MINIO_BUCKET ?? 'vortex-documents';

  /** Duração padrão de presigned URLs: 5 minutos (300 s). */
  private readonly presignedExpirySeconds = 5 * 60;

  public async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket '${this.bucket}' criado.`);
      }
    } catch (err) {
      this.logger.warn(`Não foi possível inicializar bucket MinIO: ${String(err)}`);
    }
  }

  /**
   * Gera URL presigned para PUT (upload direto pelo cliente).
   * Expira em 5 minutos conforme parâmetro regulatório.
   */
  public presignedPutUrl(objectKey: string): Promise<string> {
    return this.client.presignedPutObject(this.bucket, objectKey, this.presignedExpirySeconds);
  }

  /**
   * Gera URL presigned para GET (download pelo cliente).
   * Expira em 5 minutos conforme parâmetro regulatório.
   */
  public presignedGetUrl(objectKey: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectKey, this.presignedExpirySeconds);
  }

  /**
   * Armazena conteúdo diretamente (usado por geradores de documentos internos).
   */
  public async putObject(objectKey: string, content: Buffer | string, mime: string): Promise<void> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, { 'Content-Type': mime });
  }

  /**
   * Recupera conteúdo de um objeto (para processamento interno).
   */
  public async getObject(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Exclui objeto do bucket (apenas para anonimização LGPD, nunca para apagar ledger).
   */
  public async deleteObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }
}
