import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MinioService } from './minio.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, MinioService],
  exports: [DocumentsService, MinioService],
})
export class DocumentsModule {}
