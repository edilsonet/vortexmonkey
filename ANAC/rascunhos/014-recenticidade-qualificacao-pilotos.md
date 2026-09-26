# Recenticidade, qualificação e proficiência de pilotos

> **Assunto**: experiência recente, habilitações, instrução revisória e registros de qualificação
> **Fontes principais**: RBAC 61 §§61.17, 61.19, 61.21, 61.23 e 61.33 · RBAC 91 §91.5 · IS 61-004 e IS 61-007
> **Fontes Markdown**: `artifacts/cerebro-anac/markdown/rbac/rbac-61.md`, `artifacts/cerebro-anac/markdown/rbac/rbac-91.md`, `artifacts/cerebro-anac/markdown/is/is-61-004.md`, `artifacts/cerebro-anac/markdown/is/is-61-007.md`
> **Última revisão**: 12/09/2026 · **Status**: rascunho v1

## 1. Três controles diferentes

O VORTEX deve separar três conceitos que não são intercambiáveis: (1) CMA válido, aptidão psicofísica; (2) habilitação válida, autorização para categoria, classe, tipo, IFR ou operação; (3) experiência recente/proficiência, demonstração de que o piloto pode exercer a prerrogativa na operação pretendida.

A licença de piloto é permanente, mas suas prerrogativas só podem ser exercidas com CMA válido, habilitações correspondentes válidas e experiência recente (**RBAC 61 §61.17**).

## 2. Validade das habilitações

Os prazos contam, em regra, a partir do mês de aprovação no exame de proficiência (**RBAC 61 §61.19**): classe 24 meses; tipo 12; voo por instrumentos 12; instrutor de voo 12; piloto agrícola 24; rebocador de planador 24; planador/balão livre 36; lançador de paraquedistas 24; acrobacia 24; dirigível 12.

A validade formal da habilitação não elimina experiência recente nem autoriza operação incompatível com treinamento ou limitações.

## 3. Experiência recente — regra geral de 90 dias

Nenhum piloto pode atuar como PIC ou SIC sem ter realizado nos **90 dias precedentes** (**RBAC 61 §61.21(a)**): voo diurno VFR: três decolagens e três aterrissagens em condições visuais; voo noturno: três decolagens e três aterrissagens entre uma hora após o pôr do sol e uma hora antes do nascer do sol.

O piloto deve ter efetivamente operado os comandos da aeronave da categoria, classe e modelo/tipo conforme requerido. O sistema controla a experiência por combinação operacional, não apenas por horas totais.

## 4. Experiência recente IFR

Para voo IFR ou condições abaixo dos mínimos VFR, nos últimos **seis meses** (**RBAC 61 §61.21(b)**), uma alternativa é seis horas IFR real/simulado, sendo três na categoria correspondente, e seis aproximações; a outra é aprovação em exame de proficiência na categoria, podendo a ANAC autorizar uso de FSTD.

## 5. Perda da experiência recente e instrução revisória

Após perder a experiência recente, o piloto não pode atuar como PIC/SIC até concluir instrução revisória (**RBAC 61 §61.23**), com no mínimo uma hora de solo, uma hora de voo, revisão de regras e revisão de manobras/procedimentos.

Deve ser ministrada por instrutor habilitado e qualificado, que declara no registro eletrônico/CIV que o piloto está apto. Em aeronave, é exclusivamente instrucional, sem passageiros/carga/outro serviço; em aeronave de dois pilotos, exige piloto de segurança qualificado.

## 6. Treinamento, familiarização e diferenças

A IS 61-004 distingue familiarização, que pode consistir em estudo de material, de treinamento de diferenças, que pode exigir instrução dedicada, dispositivo de treinamento e verificação de proficiência. Os registros devem indicar modelo/tipo, PIC/SIC e single/dual pilot.

A IS 61-007 exige cadastro/notificação de treinamentos e exames de Programas de Treinamento Operacional, com aluno, currículo, módulos, datas e tipo. O operador responde pela exatidão dos dados.

## 7. Responsabilidade operacional

Antes da escala, o operador verifica identidade/vínculo, licença, CMA, habilitações, experiência recente diurna/noturna, IFR, treinamento, posto PIC/SIC, composição mínima e limitações. Ausência de requisito bloqueia a designação sem apagar o histórico.

## 8. Modelo de dados para o VORTEX

### `identity.pilot_qualifications`
- pessoa/licença; licença/certificado; CMA/validade; habilitações; validade; limitações; concessão/revalidação.

### `operations.recent_experience`
- piloto; categoria/classe/modelo/tipo; DIURNA_VFR/NOTURNA/IFR; PIC/SIC; decolagens/aterrissagens; data/hora/local; efetiva operação dos comandos; CIV/registro; data-limite; status.

### `operations.proficiency_events`
- EXAME, INSTRUÇÃO_REVISÓRIA, TREINAMENTO_INICIAL, RECORRENTE, DIFERENÇAS ou FAMILIARIZAÇÃO; aeronave/FSTD; currículo; instrutor/examinador; PIC/SIC ou single/dual; resultado; validade; assinatura/ledger.

### `operations.flight_crew_eligibility`
- voo/escala; piloto/função; CMA; habilitação; recenticidade; IFR; treinamento; ELEGÍVEL/BLOQUEADO; motivos; instante da verificação.

## 9. Pontos de atenção para sistemas (VORTEX)

- CMA, habilitação, experiência recente e treinamento são controles distintos.
- Regra geral: três decolagens e três aterrissagens nos 90 dias precedentes.
- Regra noturna: janela de uma hora após o pôr do sol até uma hora antes do nascer do sol.
- IFR: seis horas nos últimos seis meses e seis aproximações, ou exame de proficiência.
- Vincular experiência à categoria, classe e modelo/tipo adequados.
- Perda de recenticidade exige instrução revisória.
- Registrar uma hora de solo, uma hora de voo e declaração do instrutor.
- Não confundir familiarização com diferenças ou exame de proficiência.
- Validar escala na designação e após alterações do voo.
- Toda decisão de elegibilidade é evento rastreável; correção cria novo evento.

---
### Fontes citadas
- RBAC 61 — `artifacts/cerebro-anac/markdown/rbac/rbac-61.md`
- RBAC 91 — `artifacts/cerebro-anac/markdown/rbac/rbac-91.md`
- IS 61-004 — `artifacts/cerebro-anac/markdown/is/is-61-004.md`
- IS 61-007 — `artifacts/cerebro-anac/markdown/is/is-61-007.md`
