// Constantes e tipos de documentos regulatórios

export const PHASE_3_DOCUMENT_EVENTS = {
  DOCUMENT_CREATED: 'DOCUMENT_CREATED',
  DOCUMENT_VERSION_ADDED: 'DOCUMENT_VERSION_ADDED',
  DOCUMENT_ANONYMIZED: 'DOCUMENT_ANONYMIZED',
  DOCUMENT_ARCHIVED: 'DOCUMENT_ARCHIVED',
  DOCUMENT_STATUS_CHANGED: 'DOCUMENT_STATUS_CHANGED',
} as const;

export type DocumentClassification = 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';
export type DocumentStatus = 'DRAFT' | 'PENDING_SIGN' | 'SIGNED' | 'ARCHIVED';

export const REGULATORY_DOCUMENT_TYPES = [
  'CRS',         // Certificado de Retorno ao Serviço
  'FCDA',        // Ficha de Cumprimento de DA
  'SEGVOO_001',  // Relatório de Segurança de Voo
  'CVA',         // Certificado de Validade de Aeronave (F-145-27E/28)
  'CERT_CONCLUSAO', // Certificado de conclusão de treinamento
  'MSG_RCR',     // Mensagem RCR
  'FATURA',      // Fatura
  'RELATORIO_SGSO', // Relatório SGSO
  'RELATORIO_S141', // Relatório S141
  'OUTRO',
] as const;

export type RegulatoryDocumentType = typeof REGULATORY_DOCUMENT_TYPES[number];

export const ALLOWED_MIME_TYPES = [
  'text/markdown',
  'application/xml',
  'text/xml',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/octet-stream',
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
