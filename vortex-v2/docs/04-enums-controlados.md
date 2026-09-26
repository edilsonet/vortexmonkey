# VORTEX — docs/04: DICIONÁRIO COMPLETO DE ENUMS CONTROLADOS (v2)

> **Versão 2 — 12/09/2026.** Os enums permanecem intocados (dados controlados regulatórios). Mudanças desta versão: nota de implementação v2 (`libs/shared-dto` no Nx) e o enum de planos/atendimento atualizado ao modelo de assinaturas v2 (Recrutamento sem comissão; novos apps).
> Estes enums impedem texto livre em campos regulatórios sensíveis.
> Implementar como `const objects` + tipos derivados (`as const`) no TypeScript, com validação em runtime.

## 1. ENUMS DE CERTIFICAÇÃO E OPERAÇÃO

### 1.1 Tipo de CIAC (RBAC 141)
| Valor | Descrição |
|-------|-----------|
| `TIPO_1_PILOTOS` | Formação de Pilotos (PP, PC, PLA, IFR, Tipo) |
| `TIPO_2_COMISSARIOS` | Formação de Comissários de Voo |
| `TIPO_3_MECANICOS` | Formação de Mecânicos de Manutenção (CEL, GMP, AVI) |

### 1.2 Nível ETOPS (RBAC 121)
| Valor | Descrição |
|-------|-----------|
| `MIN_75` | Desvio Máximo de 75 Minutos |
| `MIN_120` | Desvio Máximo de 120 Minutos |
| `MIN_138` | Desvio Máximo de 138 Minutos |
| `MIN_180` | Desvio Máximo de 180 Minutos |
| `MIN_207` | Desvio Máximo de 207 Minutos (Extensão Excepcional) |

### 1.3 Especificação PBN (IS 91-001)
| Valor | Descrição |
|-------|-----------|
| `RNAV_10` | Navegação de Área Rota Oceânica / Remota |
| `RNAV_1` | Navegação de Área Terminal SID / STAR |
| `RNAV_2` | Navegação de Área En-route Continental |
| `RNP_1` | Performance de Navegação Requerida Terminal |
| `RNP_2` | Performance de Navegação Requerida Continental |
| `RNP_4` | Performance de Navegação Requerida Oceânica |
| `RNP_APCH` | Aproximação RNP até Mínimos LNAV / LNAV-VNAV / LPV |
| `RNP_AR_APCH` | Aproximação RNP com Autorização Requerida |
| `RNP_0_3` | Operações RNP Específicas para Asas Rotativas |

### 1.4 Classe EFB (IS 91-002)
| Valor | Descrição |
|-------|-----------|
| `CLASSE_1_PORTATIL` | Hardware Comercial Portátil sem Conexão à Aeronave |
| `CLASSE_2_ACOPLADO` | Dispositivo Portátil Conectado a Suporte e Alimentação |
| `CLASSE_3_INSTALADO` | Equipamento Aviônico Integrado com Certificação de Tipo |

### 1.5 Grupo de Aeródromo Especial (IS 121-020)
| Valor | Descrição |
|-------|-----------|
| `GRUPO_A` | Aeródromos especiais Grupo A |
| `GRUPO_B` | Aeródromos especiais Grupo B |
| `GRUPO_C` | Aeródromos especiais Grupo C |

## 2. ENUMS DE MANUTENÇÃO E AERONAVEGABILIDADE

### 2.1 Categoria de Reparo MEL (IS 91-012)
| Valor | Descrição |
|-------|-----------|
| `CAT_A_ESPECIFICA` | Prazo Específico Conforme Tabela da MEL |
| `CAT_B_3_DIAS` | Prazo Máximo de 3 Dias Corridos (72 Horas) |
| `CAT_C_10_DIAS` | Prazo Máximo de 10 Dias Corridos (240 Horas) |
| `CAT_D_120_DIAS` | Prazo Máximo de 120 Dias Corridos |

### 2.2 Métodos END (IS 43.13-004)
| Valor | Descrição |
|-------|-----------|
| `LIQUIDO_PENETRANTE` | Líquido Penetrante (LP) |
| `PARTICULAS_MAGNETICAS` | Partículas Magnéticas (PM) |
| `ULTRASSOM` | Ultrassom (US) |
| `RADIOGRAFIA` | Radiografia (RX) |
| `EDDY_CURRENT` | Correntes Parasitas (Eddy Current) |
| `VISUAL` | Inspeção Visual |

### 2.3 Nível Qualificação END (IS 43.13-004)
| Valor | Descrição |
|-------|-----------|
| `NIVEL_I` | Nível I |
| `NIVEL_II` | Nível II |
| `NIVEL_III` | Nível III |

### 2.4 Etiqueta de Peça (IS 43-001)
| Valor | Descrição |
|-------|-----------|
| `VERDE_SERVICAVEL` | Servicável e documentada |
| `AMARELA_REPARAVEL_INSPECAO` | Inspeção obrigatória / quarentena técnica |
| `VERMELHA_CONDENADA_NAO_AERONAVEGAVEL` | Não aeronavegável / não documentada / refugo |

### 2.5 Certificação de Peça (RBAC 21)
| Valor | Descrição |
|-------|-----------|
| `TC` | Certificado de Tipo |
| `STC` | Certificado Suplementar de Tipo |
| `TSO` | Technical Standard Order |
| `PMA` | Parts Manufacturer Approval |
| `OTP` | Ordem Técnica Padrão |
| `PADRAO` | Peça Padrão (standard hardware) |

## 3. ENUMS DE AERÓDROMOS (RBAC 153)

### 3.1 RWYCC (Runway Condition Code)
| Valor | Descrição |
|-------|-----------|
| `RWYCC_0` | Frenagem Nula / Inoperável |
| `RWYCC_1` | Frenagem Pobre / Gelo Úmido |
| `RWYCC_2` | Frenagem Média-Pobre / Água Estagnada |
| `RWYCC_3` | Frenagem Média / Água com Lâmina até 3mm |
| `RWYCC_4` | Frenagem Boa-Média / Pista Compactada |
| `RWYCC_5` | Frenagem Boa / Pista Úmida |
| `RWYCC_6` | Frenagem Ideal / Pista Seca |

### 3.2 Agente Extintor SESCINC
| Valor | Descrição |
|-------|-----------|
| `LGE_ESPUMA` | Espuma (LGE) |
| `PQ_QUIMICO_ABC` | Pó Químico ABC |
| `PQ_QUIMICO_BC` | Pó Químico BC |

### 3.3 Áreas Manutenção Aeroportuária (IS 153-002)
| Valor | Descrição |
|-------|-----------|
| `PISTA_POUSO` | Pista de Pouso e Decolagem |
| `TAXIWAY` | Pista de Táxi |
| `PATIO` | Pátio de Aeronaves |
| `SINALIZACAO` | Sinalização Visual |
| `ILUMINACAO` | Balizamento e Iluminação |
| `SISTEMAS_ELETRICOS` | Sistemas Elétricos e Energia de Emergência |
| `EQUIPAMENTOS` | Equipamentos Operacionais |
| `VEICULOS` | Veículos de Apoio |

## 4. ENUMS DE OPERAÇÕES E PESSOAL

### 4.1 Serviços de Solo RBAC 135 (IS 135-002)
| Valor | Descrição |
|-------|-----------|
| `RAMPA` | Serviço de Rampa |
| `PASSAGEIROS` | Serviço de Passageiros |
| `BAGAGEM` | Serviço de Bagagem |
| `CABINE` | Serviço de Cabine |
| `PESO_BALANCEAMENTO` | Peso e Balanceamento |
| `EQUIPE_AUXILIAR` | Equipe Auxiliar |
| `ABASTECIMENTO` | Abastecimento |

### 4.2 Situação Aluno S141 (IS 141-001)
| Valor | Descrição |
|-------|-----------|
| `MATRICULADO` | Aluno com Matrícula Ativa em Instrução |
| `APROVADO` | Curso Concluído com Cumprimento Integral de Matriz |
| `REPROVADO` | Aluno Desligado por Insuficiência Técnica ou Frequência |
| `CANCELADO` | Matrícula Encerrada por Decisão Administrativa ou Prazo |
| `TRANSFERIDO` | Transferência Homologada para Outro CIAC |
| `DESISTENTE` | Desistência Formal Solicitada pelo Discente |

### 4.3 Tipo Currículo CTAC (IS 142-001)
| Valor | Descrição |
|-------|-----------|
| `CURRICULO_BASE` | Currículo Base |
| `CURRICULO_ESPECIALIZADO` | Currículo Especializado |
| `OUTROS` | Outros Currículos |

## 5. ENUMS DE CREDENCIAMENTO (RBAC 183)

### 5.1 Escopo Grupos PCA (IS 183-005)
| Valor | Descrição |
|-------|-----------|
| `GRUPO_A_PEQUENO_PORTE` | Grupo A — Pequeno Porte |
| `GRUPO_B_MEDIO_PORTE` | Grupo B — Médio Porte |
| `GRUPO_C_GRANDE_PORTE` | Grupo C — Grande Porte |

### 5.2 Categoria Vinculação PCA (IS 183-005)
| Valor | Descrição |
|-------|-----------|
| `PCA_EMPREGADO` | PCA Empregado (vínculo empregatício formal) |
| `PCA_AUTONOMO` | PCA Autônomo (prestador de serviços independente) |

## 6. ENUMS DE STATUS DOCUMENTAL E OPERACIONAL

### 6.1 Status Documental Regulatório
| Valor | Descrição |
|-------|-----------|
| `MINUTA` | Documento em Elaboração Interna |
| `SUBMETIDO` | Transmitido para Avaliação Formal da Autoridade |
| `EM_ANALISE` | Em Processo Técnico de Vistoria / Auditoria |
| `APROVADO` | Aprovado Formalmente com Portaria / Documento ANAC |
| `ACEITO` | Aceito sem Homologação Formal (Conforme Norma) |
| `REJEITADO` | Devolvido com Pendências de Não Conformidade |
| `REVOGADO` | Documento Tornado Nulo ou Substituído |

### 6.2 Status Certificado Operacional
| Valor | Descrição |
|-------|-----------|
| `ATIVO` | Certificado Ativo |
| `SUSPENSO_CAUTELAR` | Suspensão Cautelar |
| `CASSADO` | Cassação Definitiva |
| `EXPIRADO` | Certificado Expirado |

## 7. ENUMS DE ASSINATURA E DOCUMENTOS (Parte 3)

### 7.1 Nível de Assinatura (Lei 14.063/2020)
| Valor | Descrição |
|-------|-----------|
| `SIMPLES` | Assinatura eletrônica simples (senha, código, e-mail) |
| `AVANCADA` | Assinatura eletrônica avançada (Gov.br, MFA, biometria) |
| `QUALIFICADA` | Assinatura eletrônica qualificada (ICP-Brasil A1/A3) |

### 7.2 Nível de Acesso de Documento
| Valor | Descrição |
|-------|-----------|
| `PUBLIC` | Consulta pública (verificação) |
| `RESTRICTED` | Somente usuários da organização |
| `PRIVATE` | Somente usuários autorizados |

## 8. ENUMS DE LICENÇAS E HABILITAÇÕES (RBAC 61/63/65)

### 8.1 Tipo de Licença
| Valor | Descrição |
|-------|-----------|
| `PP` | Piloto Privado |
| `PC` | Piloto Comercial |
| `PLA` | Piloto de Linha Aérea |
| `MMA` | Mecânico de Manutenção Aeronáutica |
| `DOV` | Despachante Operacional de Voo |
| `COMISSARIO` | Comissário de Voo |
| `MECANICO_VOO` | Mecânico de Voo |

### 8.2 Habilitações (RBAC 61)
| Valor | Descrição |
|-------|-----------|
| `IFRA` | Voo por Instrumentos (Avião) |
| `MLTE` | Multimotor Terrestre |
| `MNTE` | Monomotor Terrestre |
| `IFRH` | Voo por Instrumentos (Helicóptero) |
| `CELULA` | Célula (MMA) |
| `GMP` | Grupo Motopropulsor (MMA) |
| `AVIONICOS` | Aviónicos (MMA) |

### 8.3 Classe de CMA (RBAC 67)
| Valor | Descrição |
|-------|-----------|
| `CLASSE_1` | Classe 1 (PLA/PC) |
| `CLASSE_2` | Classe 2 (PP/Comissário) |
| `CLASSE_3` | Classe 3 (Controlador) |
| `CLASSE_4` | Classe 4 (VANT leve) |

## 9. ENUMS DE ASSINATURAS E APPS (v2 — atualizado)

### 9.1 Produto de Assinatura (v2)
| Valor | Descrição |
|-------|-----------|
| `RCONTA_VIP` | Rconta VIP (remove banners na Rconta do comprador) |
| `ASSINATURA_VAGAS` | Assinatura de Vagas (Recrutamento para empresa sem ERP) |
| `ERP_MANUTENCAO` | ERP Manutenção 43/145 (Recrutamento incluso) |
| `ERP_OPERADORES` | ERP Operadores 91/121/135 (Recrutamento incluso) |
| `ERP_CURSOS` | ERP Cursos e Treinamentos 141/142 + ISs (Recrutamento incluso) |
| `ERP_AGRICOLA` | ERP Agrícola 137 (Recrutamento incluso) |
| `ERP_AERODROMOS` | ERP Aeródromos 153 (Recrutamento incluso) |
| `PUBLICACOES_[PACOTE]` | Assinatura anual de publicações (manuais digitalizados licenciados) |

> **v2:** não existe mais assinatura "RECRUTAMENTO" — o uso vem embutido em todo ERP ou na Assinatura de Vagas. **Sem comissão de recrutamento** (regra removida do BRE).

### 9.2 Tipo de Concessão de Acesso ao Ledger (v2 — seção 5-A)
| Valor | Descrição |
|-------|-----------|
| `DONO` | Acesso do dono do dado (enquanto durar o vínculo) |
| `SUPORTE_PROTOCOLO` | Acesso administrativo com protocolo do próprio dono |
| `AUDITORIA_CONSENTIDA` | Auditoria ANAC autorizada pelo dono |
| `AUDITORIA_COMPULSORIA` | Auditoria ANAC compulsória (após recusa/suspensão) |
| `JUSTICA` | Ordem judicial (segredo de justiça: meta-eventos confidenciais) |

### 9.3 Origem de Estoque/Anúncio (v2)
| Valor | Descrição |
|-------|-----------|
| `RCONTA_PESSOAL` | Estoque pessoal (módulo Profissional) |
| `RCONTA_EMPRESARIAL` | Estoque empresarial (módulo Empresarial, 1 por empresa) |
| `RLOJA` | Estoque criado na RLoja (migra ao ERP ao contratar) |
| `ERP_MANUTENCAO` | Estoque do ERP Manutenção |
| `ERP_OPERADORES` | Estoque do ERP Operadores |
| `ERP_CURSOS` | Estoque do ERP Cursos |
| `ERP_AGRICOLA` | Estoque do ERP Agrícola |
| `ERP_AERODROMOS` | Estoque do ERP Aeródromos |

### 9.4 Tipo de Tenant (v2)
| Valor | Descrição |
|-------|-----------|
| `ERP` | ERP (qualquer dos 5) |
| `RH` | Recursos Humanos (Recrutamento) |
| `CRM` | CRM |
| `LOJA` | Marketplace (RLoja) |
| `OPERADORES` | Operadores |
| `MANUTENCAO` | Manutenção |
| `INSTRUCAO` | Instrução |
| `AGRICOLA` | Agrícola (v2) |
| `AERODROMO` | Aeródromo (v2) |
| `CERTPUB` | Certificações e Publicações (v2) |
| `TRAVEL` | Agência de viagens (v2) |
| `FRETAMENTO` | Fretamento (v2) |

## 10. NOTA DE IMPLEMENTAÇÃO (v2)
1. Todos os enums vivem em **`libs/shared-dto`** (monorepo Nx) — única fonte importada pelo Angular e pelo NestJS; nunca duplicados.
2. Padrão: `const objects` + tipos derivados (`as const`) + validação em runtime (class-validator compartilhado).
3. Enums regulatórios **não podem ser alterados por código de aplicação** — só por seed/versionamento do `shared-dto` (com revisão).
