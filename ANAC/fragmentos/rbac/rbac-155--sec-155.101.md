---
categoria: "Regulamento Brasileiro da Aviação Civil"
sigla: "RBAC"
slug: "rbac-155"
titulo: "RBAC 155"
fonte: "ANAC — acervo oficial (PDF/SEI), coletado em 12/09/2026"
arquivo_original: "normas/rbac/rbac-155--Abrir.txt"
norma: "rbac-155"
fragmento: "rbac-155--sec-155.101"
secao: "155.101"
titulo_secao: "Dados Aeronáuticos"
---

155.101 Dados Aeronáuticos

   (a) O estabelecimento e a comunicação de dados aeronáuticos relacionados a helipontos devem
estar em conformidade com os requisitos de integridade e acurácia dispostos nas Tabelas A-1 a A-5,
contidas no Apêndice A, levando em consideração os procedimentos do sistema de qualidade
existente. Os requisitos de acurácia para dados aeronáuticos se baseiam em um nível de confiança de
95% (noventa e cinco por cento) e, nesse aspecto, três tipos de dados posicionais devem ser
identificados: pontos levantados (por exemplo, cabeceira da FATO), pontos calculados (cálculos
matemáticos a partir dos pontos levantados conhecidos de pontos no espaço, fixos) e pontos
declarados (por exemplo, pontos de contorno de região de informação de voo).
   (b) A integridade dos dados aeronáuticos deve ser mantida por meio de todo o processamento
dos dados, desde o seu levantamento/origem até sua obtenção pelo usuário interessado. Com base na
classificação de integridade aplicável, os procedimentos de validação e verificação devem:
      (1)   para dados de rotina: evitar corrupção de dados ao longo do seu processamento;
     (2) para dados essenciais: assegurar que não ocorra corrupção de dados em nenhuma etapa
do processo, podendo incluir processos adicionais, conforme necessário, para tratar de riscos
potenciais em toda arquitetura do sistema, assegurando a integridade dos dados neste nível; e
      (3) para dados críticos: assegurar que não ocorra corrupção de dados em nenhuma etapa do
processo, incluindo procedimentos adicionais de garantia da integridade para mitigar totalmente os
efeitos de falhas identificadas como risco potencial à integridade dos dados, por meio de análise
detalhada de toda arquitetura do sistema.
   (c) A proteção de dados aeronáuticos eletrônicos, no seu armazenamento ou durante a sua
transferência, deve ser totalmente monitorada pela checagem de redundância cíclica (CRC). Para
alcançar a proteção do nível de integridade de dados aeronáuticos críticos e essenciais, em
conformidade com a classificação definida no parágrafo 155.101(b), devem ser aplicados
respectivamente algoritmos CRC de 32 ou 24 bit.
   (d) Para obter a proteção do nível de integridade de dados aeronáuticos de rotina, conforme
classificado no parágrafo 155.101(b)(1), deve ser aplicado um algoritmo CRC de 16 bit.
   (e) As coordenadas geográficas indicando a latitude e a longitude devem ser determinadas com
base no datum de referência do Sistema Geodésico Mundial – 1984 (WGS-84), e identificadas aquelas
coordenadas geográficas que foram transformadas para o sistema WGS-84 por meios matemáticos e
cuja acurácia do levantamento de campo original não satisfaça os requisitos constantes do Apêndice
A, Tabela A-1.
   (f) A acurácia do levantamento de campo deve ser de forma que os dados da navegação
operacional resultantes, utilizados nas fases de voo, estejam dentro dos limites de desvios máximos,
no que tange à base de referência apropriada, conforme indicado nas tabelas constantes do Apêndice
A.
   (g) Além da elevação (em relação ao nível médio do mar) de posições específicas levantadas no
solo em helipontos, deve ser determinada a ondulação do geoide (em relação ao elipsoide WGS-84)
para essas posições, conforme indicado no Apêndice A.
