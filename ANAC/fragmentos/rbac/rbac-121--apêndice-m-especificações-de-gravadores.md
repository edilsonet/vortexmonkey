---
categoria: "Regulamento Brasileiro da Aviação Civil"
sigla: "RBAC"
slug: "rbac-121"
titulo: "RBAC 121"
fonte: "ANAC — acervo oficial (PDF/SEI), coletado em 12/09/2026"
arquivo_original: "normas/rbac/rbac-121--Abrir.txt"
norma: "rbac-121"
fragmento: "rbac-121--apêndice-m-especificações-de-gravadores"
titulo_secao: "APÊNDICE M – ESPECIFICAÇÕES DE GRAVADORES DIGITAIS DE DADOS DE"
---

APÊNDICE M – ESPECIFICAÇÕES DE GRAVADORES DIGITAIS DE DADOS DE
                        VOO PARA AVIÕES

Todos os valores registrados devem atender aos requisitos de faixa, resolução e precisão
durante condições estáticas e dinâmicas. Todos os dados registrados devem ser
correlacionados em tempo dentro da faixa de um segundo.




Origem: SSO                                                                      278/312
                                                                            SEGUNDOS
                                                     PRECISÃO NA               POR
                                                                                              RESOLUÇÃO
      PARÂMETROS                    FAIXA            ENTRADA DO            INTERVALO                                                            NOTAS
                                                                                              DA LEITURA
                                                       SENSOR                   DE
                                                                          AMOSTRAGEM
1. Hora ou contagem relativa                                                                                   Hora UTC, preferencialmente, quando disponível. Incrementos contados a
                               24 Hrs, 0 até 4095    ±0.125% por hora            4                1 seg
de tempo. (1)                                                                                                  cada 4 segundos de operação do sistema.
                                - 1000 pés até a
                                altitude máxima      ±100 a ± 700 pés
                                                                                                               Quando praticável, os dados devem ser obtidos do computador de dados
2. Altitude Pressão.             certificada da      (ver tabela OTP             1              5 a 35 pés
                                                                                                               aéreos.
                                aeronave +5000       C124a ou C51a.
                                       pés
                               50 KIAS ou valor
                                 mínimo até a
3. Velocidade no ar indicada                                                                                   Quando praticável, os dados devem ser obtidos do computador de dados
                               máxima VSO e da          ±5% e ±3%                1                 1kt
ou calibrada.                                                                                                  aéreos.
                                máxima VSO até
                                    1,2 VD
                               0-360o e posições
4. Proa (referência primária                                                                                   Quando proa magnética ou verdadeira for selecionável com referência
                               discretas ―true‖ ou          ±2o                  1                 0,5o
da tripulação)                                                                                                 primária de proa, a seleção discreta deve ser gravada.
                                     ―mag‖.
                                                       ±1% da faixa
5. Aceleração Normal                                 máxima excluindo
                                  -3g até +6g                                  0,125             0,004g
(vertical) (9)                                       erro de referência
                                                          de ±5%
                                                                           1 ou 0,25 para
6. Atitude de arfagem                 ±75o                  ±2°           aviões sujeitos a        0,5o        É recomendada uma razão de amostragem de 0,25.
                                                                            121.344(f).
                                                                           1 ou 0,5 para
7. Atitude de rolamento (2)          ±180°                  ±2°           aviões sujeitos a        0,5         É recomendada uma razão de amostragem de 0,5.
                                                                            121.344(f).
8. Seleção manual do            On-off discreto
                                                                                                               Preferencialmente de cada tripulante, mas aceitável um discreto para todas
comando do rádio
                                                             _                   1                  _          as transmissões desde que o sistema CVR/ FDR atenda aos requisitos de
transmissor ou referência de        Nenhum                                                                     sincronização do CVR da OTP 124a (parágrafo 4.2.1 ED-55)
sincronização CVR/ DFDR
9. Potência/ empuxo de cada                                                                                    Devem ser registrados parâmetros suficientes (EPR, N1 ou torque, NP),
                                 Toda a faixa à                                               0,3% de toda a
motor – referência primária                                ±2%             1 (por motor)                       como apropriado para o particular motor, para determinação da potência à
                                    frente                                                        faixa
da tripulação.                                                                                                 frente ou em reverso, incluindo possíveis condições de sobre-velocidade
10. Engajamento do piloto
                                 On-off discreto           _                   1                  _                                             _
automático.
                                                     ±1,5% da faixa
                                                        máxima,
11. Aceleração longitudinal.          ±1g                                     0,25             0,004g                                           _
                                                    excluindo erro de
                                                   referência de ±5%.
                                                                                                             Para aviões que possuem controles de voo com capacidade ―break away‖,
                                                   ±2%, a menos que                                          permitindo que os pilotos operem os controles independentemente, devem
12a. Posição do(s) controle(s)                                          0,5 ou 0,25 para
                                                     precisão maior                         0,5% da faixa    ser gravadas as posições de ambos os controles. Os movimentos dos
de arfagem (para aviões não        Faixa total                          aviões sujeitos a
                                                    seja especifica-                            total.       comandos podem ser amostrados alternadamente, uma vez por segundo,
fly-by-wire).(18)                                                          121.344(f)
                                                    mente requerida.                                         para produzir um intervalo de amostragem de 0,5 ou 0,25, como
                                                                                                             apropriado.
                                                   ±2%, a menos que
12b. Posição do(s) controle(s)                                          0,5 ou 0,25 para
                                                    precisão maior                          0,2% da faixa
de arfagem (para aviões fly-       Faixa total                          aviões sujeitos a                                                       _
                                                    seja especifica-                            total.
by-wire). (3)(18)                                                          121.344(f)
                                                    mente requerida
                                                                                                             Para aviões que possuem controles de voo com capacidade ―break away‖,
                                                   ±2%, a menos que
                                                                                                             permitindo que os pilotos operem os controles independentemente, devem
13a. Posição do(s) controle(s)                       precisão maior     0.5 ou 0,25 para
                                                                                            0,2% da faixa    ser gravadas as posições de ambos os controles. Os movimentos dos
de rolamento (aviões não fly-      Faixa total            seja          aviões sujeitos a
                                                                                                total.       comandos podem ser amostrados alternadamente, uma vez por segundo,
by-wire) (18)                                       especificamente       121.344(f).
                                                                                                             para produzir um intervalo de amostragem de 0,5 ou 0,25, como
                                                       requerida.
                                                                                                             apropriado.
                                                   ±2%, a menos que
13b. Posição do(s) controle(s)                       precisão maior     0.5 ou 0,25 para
                                                                                            0,2% da faixa
de rolamento (aviões fly-by-       Faixa total            seja          aviões sujeitos a                                                       _
                                                                                                total.
wire). (4) (18)                                     especificamente       121.344(f).
                                                       requerida.
                                                                                                             Para aviões que possuem controles de voo com capacidade ―break away‖,
                                                   ±2°, a menos que
14a. Posição do(s) controle(s)                                                                               permitindo que os pilotos operem os controles independentemente, devem
                                                    precisão maior                          0,3 % da faixa
de guinada (aviões não fly-        Faixa total                                0,5                            ser gravadas as posições de ambos os controles. Os movimentos dos
                                                    seja especifica-                             total
by-wire). (5) (18)                                                                                           comandos podem ser amostrados alternadamente, uma vez por segundo,
                                                   mente requerida.
                                                                                                             para produzir um intervalo de amostragem de 0,5.
                                                   ±2o, a menos que
14b. Posição do(s) controle(s)                      precisão maior
                                                                                            0,2% da faixa
de guinada (aviões fly-by-         Faixa total            seja                0,5                                                               -
                                                                                                total.
wire).(18)                                         especificamente
                                                      requerida.
                                                      ±2°, a menos que                                              Para aviões equipados com superfícies múltiplas ou separáveis, é aceitável
15. Posições das superfícies                                               0,5 ou 0,25 para
                                                       precisão maior                           0,3 % da faixa      uma combinação adequada de informações em lugar de gravar cada
do controle de arfagem.             Faixa total                            aviões sujeitos a
                                                       seja especifica-                              total          superfície separadamente. As superfícies de controle podem ser amostradas
(6)(18)                                                                       135.152(j)
                                                      mente requerida.                                              alternadamente para produzir um intervalo de amostragem de 0,5 ou 0,25.
                                                      ±2°, a menos que
                                                                                                                    É aceitável uma combinação apropriada de sensores de posição de
                                                       precisão maior      0,5 ou 0,25 para
16. Posições das superfícies                                                                     0,3% da faixa      superfície em lugar de gravar cada superfície separadamente. As superfícies
                                    Faixa total              seja          aviões sujeitos a
do controle lateral. (7)(18)                                                                         total          de controle podem ser amostradas alternadamente para produzir um
                                                      especificamente         121.344(f)
                                                                                                                    intervalo de amostragem de 0,5 ou 0,25.
                                                         requerida.
                                                      ±2°, a menos que
                                                                                                                    É aceitável uma combinação apropriada de sensores de posição de
17. Posições das superfícies                           precisão maior
                                                                                                 0.2% da faixa      superfície em lugar de gravar cada superfície separadamente. As superfícies
do controle de guinada.             Faixa total              seja                0,5
                                                                                                     total          de controle podem ser amostradas alternadamente para produzir um
(8)(18)                                               especificamente
                                                                                                                    intervalo de amostragem de 0,5 ou 0,25.
                                                         requerida.
                                                        ±1,5% da faixa
                                                           máxima,
18. Aceleração lateral                 ±1g                                       0,25               0,004g                                              _
                                                      excluindo erro de
                                                      referência de ±5%
                                                      ±3°, a menos que
19. Posição da superfície do
                                                       precisão maior                            0,6% da faixa
compensador de                      Faixa total                                   1                                                                     _
                                                       seja especifica-                              total
profundidade. (9)
                                                      mente requerida.

20. Posição do flape de bordo
                                Faixa total ou cada    ±3° or as Pilot's                                            A posição do flape e do controle na cabine podem ser amostradas a
de fuga ou do controle de                                                         2            0.5% of full range
                                 posição discreta         indicator                                                 intervalos de 4 segundos, dando dados de posição a cada 2 segundos.
seleção na cabine.(10)

                                                      ±3° or as Pilot's
21. Posição do flape de bordo                           indicator and                                             Nos lados esquerdo e direito, a posição do flape e do controle na cabine
                                Faixa total ou cada
de ataque ou do controle de                              sufficient to            2            0.5% of full range podem ser amostradas a intervalos de 4 segundos, dando dados de posição
                                 posição discreta
seleção na cabine.(11)                                 determine each                                             a cada 2 segundos.
                                                      discrete position

22. Posição de cada reversor      Recolhido, em                                                                     Turbojato – 2 discretos permitem que os três estados sejam determinados.
de empuxo (ou equivalente       trânsito ou reverso            -            1 (por motor)              -
para aviões a hélice)                (discreto)                                                                     Turboélice – discreto.
                                                       ±2°, a menos que
23. Posição do spoiler de solo                                               1 ou 0,5 para
                                 Faixa total ou cada    precisão maior                           0,5% da faixa
ou posição do seletor do freio                                              aviões sujeitos a                                                          _
                                  posição discreta      seja especifica-                             total
aerodinâmico. (12)                                                             121.344(f)
                                                       mente requerida.
24. Temperatura do ar
externo ou temperatura total     −50 °C to +90 °C            ±2 °C                 2                0.3 °C                                             _
do ar. (13)
25. Modo e situação de           Uma combinação
                                                                                                                  Os discretos devem mostrar quais sistemas estão engajados e que modos
engajamento do autopilot/         adequada de                  _                   1                  _
                                                                                                                  primários estão controlando a trajetória de voo e a velocidade da aeronave.
auto-throttle/ AFCS                 discretos
                                                         ±2 pés ou ±3%
                                                       abaixo de 500 pés,                                         Para operações de pouso automático Categoria III: cada rádio altímetro
                                                                                                1 pé + 5% acima
26. Altitude rádio (14)          -20 até 2.500 pés     o que for maior, e          1                              deve ser gravado mas arranjados de modo a ter pelo menos 1 gravando a
                                                                                                   de 500 pés.
                                                       ±5% acima de 500                                           cada segundo.
                                                              pés
                                       ±400
                                 microampéres ou                                                                  Para operações de pouso automático Categoria III: cada sistema deve ser
27. Desvio do localizer,          faixa do sensor      Como instalado; ±                         0,3% da faixa    gravado mas arranjados de modo a ter pelo menos 1 gravando a cada
azimute do MLS ou desvio de      disponível como                                   1
                                                       3% recomendável.                              total.       segundo. Não é necessário gravar ILS e MLS ao mesmo tempo; apenas o
latitude do GPS.                     instalado.                                                                   auxílio de aproximação sendo usado precisa ser gravado.
                                        ±62o
                                       ±400                                                                       Para operações de pouso automático Categoria III: cada sistema deve ser
28. Desvio do glide-slope,       microampéres ou                                                 0,3% da faixa    gravado mas arranjados de modo a ter pelo menos 1 gravando a cada
                                                       Como instalado; ±           1
elevação do MLS ou desvio         faixa do sensor                                                    total.       segundo. Não é necessário gravar ILS e MLS ao mesmo tempo; apenas o
                                                       3% recomendável                                            auxílio de aproximação sendo usado precisa ser gravado.
vertical do GPS.                 disponível como
                                     instalado.
29. Passagem pelo Marker
                                 ―On-off‖ discreto             _                   1                  _           Um único discreto é aceito para todos os markers.
Beacon
                                                                                                                  Gravar o alarme mestre e cada alarme vermelho que não puder ser
30. Alarme mestre                     discreto                                     1
                                                                                                                  determinado por outro parâmetro ou pelo CVR.
31. Sensor ar/terra
(referência primária do           Discreto ―ar‖ ou                              1 (0,25
                                                               _                                      _
sistema do avião: trem de             ―terra‖                               recomendado)1
nariz ou principal)
                                                                             2 ou 0,5 para                        Se forem disponíveis sensores esquerdo e direito, cada um pode ser
32. Ângulo de ataque (se                                                                         0,3% da faixa
                                  Como instalado        Como instalado      aviões operados                       gravado a intervalos de 4 ou 1 seg., como apropriado, de modo a prover um
medido diretamente).                                                                                 total.
                                                                                segundo                           ponto de dados a cada 2 ou 0,5 seg, como requerido.
                                                                           121.344(f)

                                   Discreto ou
                                conforme a faixa
33. Baixa pressão hidráulica                                                                0,5% da faixa
                                    do sensor              ±5%                 2
de cada sistema.                                                                                total.
                                disponível, ―low‖
                                  ou ―normal‖.

                                                      O sistema mais                        0.2% da faixa
34. Velocidade no solo           Como instalado                                2                                                                      -
                                                     preciso instalado                          total

35. GPWS (Sistema de                                                                                            Uma combinação adequada de discretos a menos que a capacidade do
                                Discreto ―warning‖
alarme de proximidade do                                    _                  1                   _            gravador seja limitada; nesse caso um único dicreto para todos os modos é
                                     ou ―off‖
solo)                                                                                                           aceitável.
36. Posição do trem de pouso
ou posição do seletor do trem        Discreto                -                 4                   _            Deve ser gravada uma combinação adequada de discretos
na cabine.
37. Ângulo de deriva (15)        Como instalado      Como instalado            4                 0,1o                                                 -
38. Velocidade e direção do
                                 Como instalado      Como instalado            4              1 kt e 1,0o                                             -
vento
                                                                                           0,002o ou como       Fornecido pela referência do sistema de navegação primário. Quando a
39. Latitude e Longitude         Como instalado      Como instalado            4
                                                                                              instalado         capacidade permitir a resolução da latitude/longitude deve ser de 0,0002 o.
40. Ativação do “stick           Discretos ―on‖ e
                                                            _                  1                   _            Uma combinação adequada de discretos para determinar ativação.
shaker” e do “pusher”                 ―off‖.
41. Detecção de tesouras de      Discretos ―on‖ e
                                                            _                  1                   _                                                 _
vento                                 ―off‖.
42. Posição das manetes de                                                 1 para cada                          Para aviões com controles dos motores na cabine não ligados
                                    Faixa total            ±2%                             2% da faixa total.
potência/ throttles. (16)                                                    manete.                            mecanicamente.
                                                                                                              Quando a capacidade permitir, a prioridade preferida é nível de vibração
43. Parâmetros adicionais dos                                            Cada motor cada
                                 Como instalado      Como instalado                        2% da faixa total. indicado, N2, EGT, Fuel Flow, posição da manete de corte do combustível
motores.                                                                    segundo
                                                                                                              e N3, a menos que o fabricante do motor recomende de outra forma.
                                                                                                                Deve ser gravado uma combinação adequada de discretos para determinar a
44. Sistema embarcado de                                                                                        situação de: Controle Combinado, Controle Vertical, Aviso de Subida e
                                    Discretos        Como instalado            1                   _
prevenção de colisões (ACAS)                                                                                    Aviso de Descida (ref. ARINC Characteristiques 735 Attachment 6E,
                                                                                                                TCAS VERTICAL RA DATA OUTPUT WORLD)
45. Distâncias DME 1 e 2        0–200 NM      Como instalado         4               1 NM           1 milha.


46. Freqüências selecionadas
                                Faixa total   Como instalado         4                 _            Suficiente para determinar a freqüência recomendada
em NAV1 e NAV2

47. Ajuste barométrico do                                       (1 por 64        0,2% da faixa
                                Faixa total       ±5%                                                                                    _
altímetro selecionado.                                          segundos)            total.
48. Altitude selecionada        Faixa total       ±5%                1              100 pés                                              _

49. Velocidade selecionada      Faixa total       ±5%                1                1 kt                                               _

50. Mach selecionado            Faixa total       ±5%                1                0,01                                               _
51. Velocidade vertical
                                Faixa total       ±5%                1            100 pés/min                                            _
selecionada
52. Proa selecionada            Faixa total       ±5%                1                 1o                                                _
53. Trajetória de voo
                                Faixa total       ±5%                1                 1o                                                _
selecionada
54. Altura de decisão (DH)
                                Faixa total       ±5%               64                1 pé                                               _
selecionada
55. Formato do display do                                                                           Os discretos devem mostrar a situação do sistema (off, normal, fail,
                                Faixa total         -                4                  -
EFIS                                                                                                composite, sector, plan, nav aids, weather radar, range, copy).
                                                                                                    Os discretos devem mostrar a situação do sistema (off, normal, fail). As
56. Formato do display
                                Discreto(s)         -                4                  -           identidades das páginas dos procedimentos de emergência do display não
Multi-function/Engine Alerts.
                                                                                                    precisam ser gravadas.

57. Comandos de empuxo
                                Discreto(s)       ±2%                2          2% da faixa total                                        -
(17)

58. Empuxo desejado             Faixa total       ±2%                4          2% da faixa total                                        -
59. Quantidade de
combustível no tanque de        Faixa total       ±5%          (1 por 64 seg)   1% da faixa total                                        -
ajuste do CG
60. Referência do sistema                                                                           Um número adequado de discretos para determinar a referência do sistema
                                Faixa total         -                4                  -
primário de navegação                                                                               primário de navegação.
                                 Discreto GPS,
                               INS, VOR, DME,
61. Detecção de gelo            MLS, Loran C,               -           4         -                                               -
                               Omega, Localizer,
                                  Glide-slope


62. Alarme de vibração para    Discreto ―ice‖, ―no
                                                            -           1         -                                               -
cada motor                            ice‖.


63. Alarme de super
aquecimento para cada               Discreto                -           1         -                                               -
motor

64. Alarme de baixa pressão
                                    Discreto                -           1         -                                               -
de óleo para cada motor

65. Alarme de sobre
                                    Discreto                -           1         -                                               -
velocidade para cada motor

                                                     ±3%, a menos que
66. Posição da superfície do                                                0,3% da faixa
                                    Discreto          precisão maior    2                                                         -
compensador de direção                                                          total
                                                       seja requerida
                                                     ±3%, a menos que
67. Posição da superfície do                                                0,3% da faixa
                                   Faixa total        precisão maior    2                                                         -
compensador de inclinação                                                       total
                                                       seja requerida

68. Pressão dos freios                                                                      Para determinar esforço nos freios aplicado pelo piloto ou pelo
                                Como instalado            ±5%           1         -
(esquerdo e direito)                                                                        ―autobrake‖.

                                  Discreto ou
69. Aplicação do pedal do          analógico
                                                     ±5% (analógico)    1         -         Para determinar aplicação do freio pelos pilotos.
freio (esquerdo e direito)       ―aplicado‖ ou
                                     ―off‖.
70. Ângulo de guinada ou de
                                   Faixa total            ±5%           1       0,5o                                              -
derrapagem

71. Posição da válvula de      Discreto ―open‖ ou
                                                            -           4         -                                               -
sangria (bleed) do motor            ―closed‖.
72. Seleção do sistema de         Discreto ―on‖ ou
                                                       -           4                    -                                               -
degelo ou anti-gelo                    ―off‖.
73. Centro de gravidade
                                     Faixa total      ±5%   1 por 64 segundos   1% da faixa total                                       -
calculado
74. Estado da barra elétrica     Discreto ―power‖
                                                       -           4                    -           Cada barra
AC                                   ou ―off‖.
75. Estado da barra elétrica     Discreto ―power‖
                                                       -           4                    -           Cada barra
DC                                   ou ―off‖.
76. Posição da válvula de        Discreto ―open‖ ou
                                                       -           4                    -                                               -
sangria do APU                        ―closed‖.
77. Pressão hidráulica (cada
                                     Faixa total      ±5%          2                100 psi                                             -
sistema)
78. Perda de pressão da          Discreto ―loss‖ ou
                                                       -           1                    -                                               -
cabine                               ―normal‖

79. Falha do computador
                                 Discreto ―fail‖ ou
(Sistemas de controle de voo e                         -           4                    -                                               -
                                     ―normal‖
de controle do motor críticos)

80. Display “heads-up”
                                  Discreto ―on‖ ou
(quando instalada uma fonte                            -           4                    -                                               -
                                       ―off‖.
de informação)
81. Display “para-visual”
                                  Discreto ―on‖ ou
(quando instalada uma fonte                            -            -                   -                                               -
                                       ―off‖.
de informação)
82. Posição comandada do
                                                                                 0,2% da faixa      Quando meios mecânicos para controle dos comandos não existirem, o
controle do compensador de           Faixa total      ±5%          1
                                                                                     total          indicador de posição do compensador na cabine deve ser gravado.
profundidade.
83. Posição comandada do
                                                                                 0,7% da faixa      Quando meios mecânicos para controle dos comandos não existirem, o
controle do compensador de           Faixa total      ±5%          1
                                                                                     total          indicador de posição do compensador na cabine deve ser gravado.
inclinação.
84. Posição comandada do
                                                                                 0,3% da faixa      Quando meios mecânicos para controle dos comandos não existirem, o
controle do compensador de           Faixa total      ±5%          1
                                                                                     total          indicador de posição do compensador na cabine deve ser gravado.
direção.
85. Posição do flape de bordo                                                                       A posição dos flapes de bordo de fuga e dos controles na cabine devem ser
                                                                                 0,5% da faixa
de fuga e de seu comando na          Faixa total      ±5%          2                                amostradas alternadamente a intervalos de 4 segundos, de modo a prover
                                                                                     total
cabine                                                                                              uma amostra a cada 0,5 segundos.
86. Posição do flape de bordo
                                                                               0,5% da faixa
de ataque e de seu comando          Faixa total            ±5%          1                                                             -
                                                                                   total
na cabine

87. Posição do spoiler de solo
                                   Faixa total ou                              0,3% da faixa
e seleção do freio                                         ±5%          0,5                                                           -
                                      discreto                                     total
aerodinâmico (speed brake)


                                    Faixa total
                                                                                                  Para sistemas de controles de voo "fly-by-wire‖, quando a posição da
                                                                                                  superfície é função apenas do deslocamento do dispositivo de controle da
                                                                                                  cabine, não é necessário gravar esse parâmetro. Para aviões que possuem
88. Forças em todos os
                                  Volante ±70 lb                               0,3% da faixa      controles de voo com capacidade ―break away‖, que permite que um piloto
controles de voo da cabine                                 ±5%          1
                                                                                   total          opere os controles independentemente, devem ser gravadas as forças em
(volante, coluna e pedais)
                                                                                                  ambos os controles. As forças nos comandos podem ser amostradas
                                   Coluna ±85 lb                                                  alternadamente uma vez cada 2 segundos para produzir um intervalo de
                                                                                                  amostragem de 1 seg.
                                  Pedais ±165 lb


89. Estado do Yaw damper         Discreto (on / off)        0,5                                                                      _
(18) (19)

90. Comando do Yaw damper           Faixa total        Como instalado   0,5   1% da faixa total                                      _

91. Estado da válvula
                                      Discreto              0,5
Standby Rudder


  (1) Para aviões A300 B2/B4, resolução = 6 seg.
  (2) Para aviões das séries A330/A340, resolução = 0,703o .
  (3) Para aviões das séries A318/A319/A320/A321, resolução = 0,275% (0,088o>0,064o).
  Para aviões das séries A330/A340, resolução = 2,20% (0,703o>0,064o).
  (4) Para aviões das séries A318/A319/A320/A321, resolução = 0,22% (0,088o>0,080o).
  Para aviões das séries A330/A340, resolução = 1,76% (0,703o>0,080o).
  (5) Para aviões das séries A330/A340, resolução = 1,18% (0,703o>0,120o).
(6) Para aviões das séries A330/A340, resolução = 0,783% (0,352o>0,090o).
(7) Para aviões das séries A330/A340, resolução do aileron = 0,704% (0,352o>0,100o).
Para aviões das séries A330/A340, resolução do spoiler = 1,406% (0,703o>0,100o).
(8) Para aviões das séries A330/A340, resolução = 0,30% (0,176o>0,120o).
Para aviões das séries A330/A340, intervalo de amostragem por segundo = 1.
(9) Para aviões da série B-717, resolução = 0,005g.
Para aviões Dassault F900C/F9000EX, resolução = 0,007g.
Para aviões EMB 135/145, resolução = 0,009g
(10) Para aviões das séries A330/A340, resolução = 1,05% (0,250o>0,120o).
(11) Para aviões das séries A330/A340, resolução = 1,05% (0,250o>0,120o).
Para aviões das séries A300 B2/B4, resolução = 0,92% (0,230o>0,125o).
(12) Para aviões das séries A330/A340, resolução do spoiler = 1,406% (0,703o>0,100o).
(13) Para aviões das séries A330/A340, resolução = 0,5o C.
(14) Para aviões Dassault F900C/F900EX resolução da altitude rádio = 1,25 pés
Para aviões EMB 135/145, resolução da altitude rádio = 2 pés.
(15) Para aviões das séries A330/340, resolução = 0,352°.
Para aviões EMB 135/145, resolução = 3,4% (4°>1°)
(16) Para aviões das séries A318/A319/A320/A321, resolução = 4,32%.
Para aviões das séries A330/A340, resolução = 3,27% da faixa total para ―throttle lever angle‖ (TLA); para reversor de empuxo, a resolução ―reverse
throttle lever angle‖ (RLA) é não linear sobre o ―active reverse thrust range‖, o qual é de 51,54° até 96,14°. O elemento resolvido é 2,8° uniforme
sobre todo ―active reverse thrust range‖, ou 2.9% do valor da faixa total de 96,14°.
(17) Para aviões das series A318/A319/A320/321, com motores IAE, resolução = 2,58%.
(18) Para todas os aviões fabricados a partir de 7 de abril de 2010, inclusive, o valor para segundos por intervalo de amostragem é 0,125. Cada entrada
deve ser gravada nessa taxa. Alternativamente entradas de amostragem (interleaving) para responder a este intervalo de amostragem são proibidas.
(19) Para aviões modelo 737 fabricados entre 19 de agosto de 2000 e 6 de abril de 2010: o segundo por intervalo de amostragem é de 0,5 por controle
de entrada, as observações sobre a taxa de amostragem não são aplicáveis e um único controle de transdutor de força volante instalado no cabo de
controle da esquerda é aceitável, desde que as posições à esquerda e à direita do controle de direção também sejam gravados.
Data da emissão: 17 de março de 2010                              RBAC nº 121
                                                                  Emenda n° 00

                                       APÊNDICE N – [Reservado]




Origem: SSO                                                       290/312
Data da emissão: 17 de março de 2010                                           RBAC nº 121
                                                                               Emenda n° 00

    APÊNDICE O – REQUISITOS PARA TREINAMENTO EM ARTIGOS PERIGOSOS
                    PARA DETENTORES DE CERTIFICADO

Este apêndice lista os requisitos para o treinamento em artigos perigosos, conforme a parte 121,
subparte Z e parte 135, subparte K deste capítulo. Os requisitos para o treinamento para várias
categorias de pessoal são definidos pela função de trabalho ou responsabilidade. Um ―X‖ na
categoria de pessoal indica que tal categoria deve receber o treinamento indicado. Todos os
requisitos de treinamento se aplicam aos supervisores diretos e àqueles que executam a função. Os
requisitos de treinamento para detentores de certificado autorizados em suas especificações
operativas para transportar artigos perigosos (transporta) são determinados na Tabela 1. Estes
detentores de certificado com uma proibição em suas Especificações Operativas no carregamento e
manuseio de artigos perigosos (Não-Transporta) devem seguir o currículo determinado na Tabela 2.
O método de realização do treinamento será determinado pelo detentor de certificado. O detentor de
certificado é responsável por fornecer um método (ex. e-mail, telefone ou fac-símile) para
responder a todas as questões que venham a surgir antes do teste, independente do método de
instrução.
O detentor de certificado deve certificar-se de que um teste foi concluído satisfatoriamente para
verificar a compreensão dos regulamentos e requisitos.




Origem: SSO                                                                    291/312
Data da emissão: 17 de março de 2010                                                                 RBAC nº 121
                                                                                                     Emenda n° 00

Tabela 1 – Operadores que estão autorizados a Transportar Artigos perigosos em sua EO –
(Transporta) Detentores de Certificado
1 Aspectos do              Expedidores   Operadores     Operadores e    Atendentes    Membros da      Membros da
Transporte de Artigos       (Veja Nota         e        Atendentes de       de       Tripulação de      tripulação
perigosos                     2) Não-    Atendentes           Solo      passageiro      Voo e os         (que não
                            transporta   de Solo que     responsáveis      Não-      despachantes          sejam
                                           recebem       pelo manejo,   transporta      de carga      membros da
                                         cargas que    armazenagem e                 (balanceador)    tripulação de
                                          não sejam     abastecimento                     Não-           voo Não-
                                            artigos       de cargas e                  transporta       transporta
                                          perigosos     bagagem Não-
                                          (veja nota       transporta
                                            3) Não-
                                          transporta
2 Filosofia Geral              X             X               X              X             X                X
3 Limitações                   X             X               X              X             X                X
4 Requisitos Gerais
                               X             X
para Expedidores
5 Classificação                X             X
6 Lista de Artigos             X             X                                            X
perigosos
7 Requisitos Gerais de         X             X
Embalagem
8 Etiquetagem e                X             X               X              X             X                X
Identificação
9 Documentos de                X             X
Transporte de e outros
documentos relevantes
10 Procedimentos de                          X
aceitação Recepção
11 Reconhecimento de           X             X               X              X             X                X
Artigos perigosos Não
Declarados
12 Procedimentos de                          X               X                            X
Armazenagem e
carregamento
Abastecimento
13 Notificação do Piloto                     X               X                            X
14 Provisões para                            X               X              X             X                X
Passageiros e
Tripulação
15 Procedimentos de            X             X               X              X             X                X
Emergência

Nota 1. Conforme as responsabilidades da pessoa, os aspectos de treinamento a serem abordados
podem ser diferentes daqueles da tabela.
Nota 2. Quando uma pessoa oferece uma consignação de artigos perigosos, incluindo COMAT,
para ou no nome do detentor de certificado, essa pessoa deve ser treinada conforme o Programa de
treinamento do detentor de certificado e cumprir com as responsabilidades e treinamento do
remetente/expedidor. Caso a oferta de vantagens/mercadorias em outro equipamento do outro
detentor de certificado, a pessoa deve ser treinada conforme os requisitos de treinamento do
(regulamento a ser definido) a exemplo dos aspectos de treinamento que devem ser abordados por
qualquer expedidor oferecendo artigos perigosos para transporte.
Nota 3. Quando uma operadora/empresa, seu subsidiário ou agente se compromete com as
responsabilidades do pessoal da aceitação ou recepção, como, por exemplo, a bagagem de mão de
passageiro sendo recebida como uma carga aérea pequena, o detentor de certificado, seu subsidiário
ou agente deve ser treinado conforme o programa de treinamento do detentor de certificado e
cumprir com os requisitos de treinamento do pessoal de aceitação e recepção.
Origem: SSO                                                                                          292/312
Data da emissão: 17 de março de 2010                                                                  RBAC nº 121
                                                                                                      Emenda n° 00

Tabela 2 – Operadores que Não estão autorizados a Transportam Artigos perigosos em sua
EO – (Não Transporta) Detentores de Certificado
Aspectos do              Expedidores    Operadores     Operadores     Atendentes    Membros da      Membros
Transporte de Artigos     (Veja Nota   e Atendentes          e            de       Tripulação de        da
perigosos                   2) Não     de Solo que      Atendentes    passageiro     Voo e os       tripulação
                         Transporta       recebem         de Solo        Não       despachantes      (que não
                                        cargas que     responsávei    Transporta      de carga         sejam
                                         não sejam         s pelo                  (balanceador)    membros
                                           artigos        manejo,                       Não             da
                                         perigosos     armazenage                   Transporta      tripulação
                                       (veja nota 3)        me                                     de voo Não
                                            Não        abastecimen                                 Transporta)
                                        Transporta     to de cargas
                                                        e bagagem
                                                            Não
                                                        Transporta
Filosofia Geral              X              X               X             X             X              X
Limitações                   X              X               X             X             X              X
Requisitos Gerais para       X
Expedidores
Classificação                X
Lista de Artigos             X
perigosos
Requisitos Gerais de         X
Embalagem
Etiquetagem e                X              X               X             X             X              X
Identificação
Documentos de                X              X
Transporte de e outros
documentos relevantes
Procedimentos de
Aceitação/Rejeição
Recepção
Reconhecimento de            X              X               X             X             X              X
Artigos perigosos Não
Declaradas
Procedimentos de
Armazenagem e
Carregamento
Abastecimento/Loading
Notificação do Piloto
Provisões de                                X               X             X             X              X
informação ao para
Passageiros e
Tripulação




Procedimentos de             X              X               X             X             X              X
Emergência

Nota 1. Conforme as responsabilidades da pessoa, os aspectos de treinamento a serem abordados
podem ser diferentes daqueles da tabela.
Nota 2— Quando uma pessoa oferece uma consignação de artigos perigosos, incluindo COMAT,
para o transporte aéreo para ou em nome do detentor de certificado, essa pessoa deve ser treinada
adequadamente. Todos os expedidores de artigos perigosos devem ser treinados sob os requisitos de
treinamento do Anexo 18 e do Doc. 9284 e (regulamento a ser definido). As funções do expedidor
de acordo com o (regulamento a ser definido) espelham os aspectos de treinamento que devem
respeitados por qualquer expedidor, incluindo um (Não-Transporta) detentor de certificado
fornecendo produtos perigosos para serem transportados, com a exceção do treinamento de
Origem: SSO                                                                                          293/312
Data da emissão: 17 de março de 2010                                           RBAC nº 121
                                                                               Emenda n° 00

reconhecimento. Treinamento de reconhecimento é um requisito à parte no programa de
treinamento do detentor de certificado.
Nota 3. Quando uma operadora/empresa, seu subsidiário ou agente se compromete com as
responsabilidades do pessoal da aceitação ou recepção, como por exemplo, a bagagem de mão de
passageiro sendo recebida como uma carga aérea pequena, o detentor de certificado, seu subsidiário
ou agente deve ser treinado conforme o programa de treinamento do detentor de certificado e
cumprir com os requisitos de treinamento do pessoal de recepção.




Origem: SSO                                                                    294/312
Data da emissão: 17 de março de 2010                                             RBAC nº 121
                                                                                 Emenda n° 00

                   APÊNDICE P – REQUISITOS PARA OPERAÇÕES ETOPS

A ANAC aprovará operações ETOPS de acordo com os requisitos e limitações contidos neste
Apêndice.

Seção I. Aprovação ETOPS para aviões com dois motores.
   (a) Confiabilidade do sistema de propulsão para ETOPS.
       (1) Antes que a ANAC aprove a operação ETOPS, o operador deve ser capaz de demonstrar
que atingiu e mantém um nível de confiabilidade do sistema de propulsão, requerido pelo parágrafo
21.4(b)(2) do RBAC 21, de uma combinação avião -motor aprovada ETOPS a ser usada.
       (2) Em seguida, após a aprovação operacional ETOPS, o operador deve monitorar a
confiabilidade do sistema de propulsão para uma combinação avião-motor usada nas operações
ETOPS, e tomar as ações requeridas por 121.374(i) deste regulamento para as taxas de IFSD
especificadas.
   (b) ETOPS 75 minutos.
       (1) A ANAC aprovará operações ETOPS 75 minutos como a seguir:
          (i) a ANAC revisará a combinação avião-motor para garantir a ausência de fatores que
interfiram na segurança das operações. A combinação avião-motor não precisa necessariamente ser
um tipo aprovado para ETOPS, no entanto, deve haver evidências favoráveis suficientes para
demonstrar à ANAC um nível apropriado de confiabilidade para operações ETOPS 75 minutos;
          (ii) O detentor de certificado deve atender aos requisitos contidos na seção 121.633 deste
regulamento para o planejamento do sistema de tempo limite;
          (iii) O detentor de certificado deve desenvolver suas operações ETOPS de acordo com o
contido em suas especificações operativas;
          (iv) O detentor de certificado deve atender aos requisitos do programa de manutenção
contidos na seção 121.374 deste regulamento.
          (v) O detentor de certificado deve atender a MEL em suas especificações operativas para
ETOPS 120 minutos.
   (c) ETOPS 90 minutos. Aprovação.
       (1) A combinação avião-motor deve ser de tipo aprovado para ETOPS de pelo menos 120
minutos.
       (2) O detentor de certificado deve conduzir suas operações de acordo com a autorização
contida em suas especificações operativas.
       (3) O detentor de certificado deve atender aos requisitos do programa de manutenção contidos
na seção 121.374 deste regulamento.
       (4) O detentor de certificado deve atender à MEL em suas especificações operativas para
ETOPS 120 minutos.
   (d) ETOPS 120 minutos. Aprovação.
       (1) A combinação avião-motor deve ser de tipo aprovado para ETOPS de pelo menos 120
minutos.
       (2) O detentor de certificado deve conduzir suas operações de acordo com a autorização
contida em suas especificações operativas.


Origem: SSO                                                                      295/312
Data da emissão: 17 de março de 2010                                            RBAC nº 121
                                                                                Emenda n° 00

       (3) O detentor de certificado deve atender aos requisitos do programa de manutenção contidos
na seção 121.374 deste regulamento.
       (4) O detentor de certificado deve atender à MEL em suas especificações operativas para
ETOPS 120 minutos.
   (e) ETOPS 138 minutos. Aprovação.
       (1) Operadores com aprovação ETOPS 120 minutos. A ANAC poderá aprovar ETOPS 138
minutos como uma extensão de uma aprovação ETOPS 120 minutos como a seguir:
          (i) a extensão poderá ser concedida para voos específicos nos quais o tempo de 120
minutos possa ser excedido.
          (ii) Para estas exceções, a combinação avião-motor deve ser de tipo aprovado ETOPS 120
minutos. A capacidade dos sistemas de tempo limite do avião não pode ser menor do que 138
minutos, calculada de acordo com o prescrito na seção 121.633 deste regulamento.
          (iii) O detentor de certificado deve desenvolver suas operações ETOPS de acordo com a
autorização contida em suas especificações operativas.
          (iv) O detentor de certificado deve atender aos requisitos do programa de manutenção
contidos na seção 121.374 deste regulamento.
          (v) O detentor de certificado deve atender à MEL em suas especificações operativas para
ETOPS além de 120 minutos. Operadores sem uma MEL que atenda ao disposto acima devem
submeter à ANAC uma MEL, para aprovação, que satisfaça as políticas da MMEL para
sistemas/componentes para ETOPS além de 120 minutos.
          (vi) O detentor de certificado deve conduzir treinamentos para manutenção, despacho e
pessoal de tripulação de voo sobre as diferenças entre ETOPS 138 minutos e ETOPS 120 minutos
previamente aprovado.
   (f) ETOPS 180 minutos. Aprovação.
       (1) A combinação avião-motor deve ser de tipo aprovado para ETOPS de pelo menos 180
minutos.
       (2) O detentor de certificado deve conduzir suas operações de acordo com a autorização
contida em suas especificações operativas.
       (3) O detentor de certificado deve atender aos requisitos do programa de manutenção contidos
na seção 121.374 deste regulamento.
       (4) O detentor de certificado deve atender à MEL em suas especificações operativas para
ETOPS além de 120 minutos.
   (g) ETOPS além de 180 minutos. Aprovação.
       (1) A ANAC aprovará operações ETOPS além de 180 minutos somente para detentores de
certificado que possuam ETOPS 180 minutos aprovado para uma combinação avião-motor.
       (2) O detentor de certificado deve possuir experiência prévia satisfatória para a ANAC.
       (3) Na seleção de Aeródromos de Alternativa ETOPS, o operador deve esforçar-se para
planejar que cada operação ETOPS não exceda 180 minutos ou menos, se possível. Se as condições
indicarem a necessidade de utilização de um Aeródromo de Alternativa ETOPS além de 180
minutos, a rota poderá ser voada desde que atenda os requisitos das áreas de operação específicas
descritas nos parágrafos (h) ou (i) desta seção deste apêndice.
       (4) o detentor de certificado deve informar à tripulação de voo cada vez que o avião seja
despachado para uma operação ETOPS além de 180 minutos e qual rota foi selecionada.

Origem: SSO                                                                     296/312
Data da emissão: 17 de março de 2010                                            RBAC nº 121
                                                                                Emenda n° 00

       (5) Em adição ao equipamento especificado na MEL do detentor de certificado para ETOPS
180 minutos, os seguintes sistemas devem estar operacionais para o despacho:
          (i) Sistema indicador de quantidade de combustível.
          (ii) O APU (incluindo suprimento elétrico e pneumático e a operação na capacidade
projetada do APU).
          (iii) O sistema de "auto throttle".
          (iv) O sistema de comunicação requerido pelo parágrafos 121.99(d) ou 121.122(c) deste
regulamento, como aplicável.
          (v) Capacidade "auto-land" com um motor inoperante, se no plano de voo for previsto seu
uso.
       (6) O detentor de certificado deve conduzir suas operações de acordo com a autorização
contida em suas especificações operativas.
       (7) O detentor de certificado deve atender aos requisitos do programa de manutenção contidos
na seção 121.374 deste regulamento.
   (h) ETOPS 207 minutos.
       (1) A ANAC poderá aprovar a condução de operações ETOPS de até 207 minutos como uma
extensão à aprovação ETOPS 180 minutos, de maneira excepcional. Esta exceção pode ser utilizada
para cada voo especificamente quando um Aeródromo de Alternativa ETOPS não estiver disponível
no tempo de voo de 180 minutos por razões políticas ou militares, atividades vulcânicas, condições
temporárias de aeródromos e condições climáticas nos aeródromos abaixo do requerido para
despacho ou outros eventos climáticos relevantes.
       (2) O Aeródromo de Alternativa ETOPS 207 minutos mais próximo deve ser especificado no
despacho ou liberação de voo.
       (3) na condução deste voo, o detentor de certificado deve considerar a rota preferencial
indicada pelo ATC.
       (4) A combinação avião-motor deve ser de tipo aprovado para ETOPS 180 minutos. O tempo
aprovado, para o mais limitado Sistema Significativo ETOPS e o mais limitado tempo de supressão
de fogo dos compartimentos de carga e bagagem requeridos pela regulação dos sistemas de
supressão de fogo, deve ser de pelo menos 222 minutos.
       (5) O detentor de certificado deve registrar quantas vezes este desvio foi autorizado.
   (i) ETOPS 240 minutos em Áreas ao sul do Equador.
       (1) A ANAC poderá aprovar a condução de operações ETOPS de até 240 nas seguintes áreas:
          (i) Áreas oceânicas do Pacífico.
          (ii) Áreas oceânicas do Atlântico Sul.
          (iii) Áreas do Oceano Índico.
          (iv) Áreas oceânicas entre a Austrália e a América do Sul.
       (2) O operador deve designar o mais próximo Aeródromo de Alternativa ETOPS ao longo da
rota de voo planejada.
       (3) A combinação avião-motor deve ser de tipo aprovado para ETOPS além de 180 minutos.
   (j) ETOPS além de 240 minutos.
       (1) A ANAC poderá aprovar a condução de operações ETOPS além de 240 minutos entre
rotas entre pares de cidades específicas nas seguintes áreas:
          (i) Áreas oceânicas do Pacífico.
Origem: SSO                                                                     297/312
Data da emissão: 17 de março de 2010                                           RBAC nº 121
                                                                               Emenda n° 00

        (ii) Áreas oceânicas do Atlântico Sul.
        (iii) Áreas do Oceano Índico.
        (iv) Áreas oceânicas entre a Austrália e a América do Sul.
     (2) Esta aprovação pode ser dada aos detentores de certificado que tenham operado sob
ETOPS 180 minutos ou maior por, pelo menos, 24 meses consecutivos dos quais, pelo menos 12
meses, devem ser sob autorização de ETOPS 240 minutos para uma combinação avião -motor.
     (3) O operador deve designar os mais próximos Aeródromos de Alternativa ETOPS
disponíveis ao longo da rota planejada de voo.
     (4) Para estas operações, a combinação avião-motor deve ser de tipo aprovada pára ETOPS
maior que 180 minutos.

Seção II. Aprovação ETOPS para aviões com mais de 2 motores.

   (a) A ANAC poderá aprovar a condução de operações ETOPS como a seguir:
      (1) Exceto como prescrito na seção 121.162 deste regulamento, a combinação avião-motor
deve ser de tipo aprovado para operações ETOPS.
      (2) O operador deve designar o mais próximo Aeródromo de Alternativa ETOPS 240 minutos
(na velocidade de cruzeiro com um motor inoperante em condições de atmosfera padrão com ar
calmo). Se um Aeródromo de Alternativa ETOPS não estiver disponível no tempo de 240 minutos
de voo, o operador deve designar o mais próximo Aeródromo de Alternativa ETOPS ao longo da
rota planejada de voo.
      (3) As limitações da MEL para o desvio ETOPS aplicável.
         (i) O sistema indicador da quantidade de combustível deve estar operacional.
         (ii) O sistema de comunicações requerido pelos parágrafos 121.99(d) ou 121.122(c) deve
estar operacional.
      (4) O detentor de certificado deve operar de acordo com a autorização ETOPS contida em
suas especificações operativas.

Seção III. Aprovação para operações de rotas de aviões que planejem atravessar a Área Polar
Sul.

   (a) Nenhum detentor de certificado pode operar na Área Polar Sul a não ser que autorizado pela
ANAC.
   (b) Em adição aos requisitos das seções I e II deste apêndice, as especificações operativas do
detentor de certificado devem conter o seguinte:
      (1) A designação dos aeródromos que poderiam ser usados no caso de desvios em rota e os
requisitos que estes aeródromos devem atender no caso da ocorrência destes desvios.
      (2) Exceto para operações suplementares cargueiras, um plano de recolhimento dos
passageiros nos aeródromos designados na ocorrência de desvios.
      (3) Uma estratégia para lidar com o congelamento do combustível e procedimentos para
monitorar esta situação.
      (4) Um plano que garanta a capacidade de comunicação para estas operações.
      (5) Uma MEL para estas operações.
      (6) Um plano de treinamento para as operações nestas áreas.
Origem: SSO                                                                    298/312
Data da emissão: 17 de março de 2010                                            RBAC nº 121
                                                                                Emenda n° 00

       (7) Um plano de mitigação da exposição de tripulação à radiação durante atividades de "solar
flare".
       (8) Um plano para prover, pelo menos, duas roupas anti-exposição a baixas temperaturas no
avião, para proteção dos tripulantes durante atividades externas em um aeródromo de desvio com
condições climáticas extremas. A ANAC poderá não exigir o cumprimento deste parágrafo se for
demonstrado que na época do ano do voo o equipamento torna-se desnecessário.




Origem: SSO                                                                     299/312
Data da emissão: 17 de março de 2010                                           RBAC nº 121
                                                                               Emenda n° 00

 APÊNDICE Q – ESTRUTURA DO SISTEMA DE GERENCIAMENTO DA SEGURANÇA
                            OPERACIONAL

   (a) Este Apêndice apresenta a estrutura para a implantação e manutenção do sistema de
gerenciamento da segurança operacional (SGSO) por parte dos detentores de certificado. A
estrutura consiste de quatro componentes e treze elementos e sua implantação será proporcional ao
tamanho da organização e complexidade das operações.
   (b) Definições e conceitos.
      (1) Segurança operacional. É o estado no qual o risco de lesões a pessoas ou danos a bens se
reduzem e se mantêm em um nível aceitável ou abaixo deste, pó meio de um processo contínuo de
identificação de perigos e gestão de riscos.
      (2) Perigo. Condição, objeto ou atividade que potencialmente pode causar lesões às pessoas,
danos ao equipamento ou estruturas, perda de pessoal ou redução da habilidade para desempenhar
uma função determinada.
      (3) Risco. A avaliação das consequências de um perigo, expresso em termos de probabilidade
e severidade, tomando como referência a pior condição possível.
      (4) Gestão de riscos. A identificação, análise e eliminação e/ou mitigação dos riscos que
ameaçam as capacidades de uma organização a um nível aceitável.
      (5) Nível aceitável de segurança operacional. Na prática, este conceito se expressa mediante
indicadores e objetivos de desempenho da segurança operacional (medidas ou parâmetros) e se
aplica por meio de vários requisitos de segurança operacional.
      (6) Indicadores de desempenho de segurança operacional. São as medidas ou parâmetros que
são empregados para expressar o nível de segurança operacional alcançado por um sistema.
      (7) Objetivos de desempenho da segurança operacional. São os níveis de desempenho da
segurança operacional requeridos em um sistema. Um objetivo de desempenho da segurança
operacional compreende um ou mais indicadores de desempenho da segurança operacional, junto
com os resultados desejados, expressos em termos destes indicadores.
      (8) Requisitos de segurança operacional. São meios necessários para atingir os objetivos de
segurança operacional.
   (c) Componentes de estrutura do SGSO de um detentor de certificado
      (1) Política e objetivos de segurança operacional:
          (i) responsabilidade e compromisso da administração;
          (ii) responsabilidade da direção acerca da segurança operacional;
          (iii) designação do pessoal chave de segurança operacional;
          (iv) plano de implantação do SGSO
          (v) coordenação do plano de resposta a emergências; e
          (vi) documentação
      (2) Gerenciamento dos riscos de segurança operacional
          (i) processos de identificação de perigos;
          (ii) processos de avaliação e mitigação de riscos
      (3) Garantia da segurança operacional
          (i) monitoramento e medição do desempenho da segurança operacional;
          (ii) gestão de mudança;
Origem: SSO                                                                    300/312
Data da emissão: 17 de março de 2010                                               RBAC nº 121
                                                                                   Emenda n° 00

          (iii) melhora contínua do SGSO.
       (4) Promoção da segurança operacional:
          (i) treinamento e capacitação;
          (ii) comunicação acerca da segurança operacional
   (d) Políticas e objetivos da segurança operacional
       (1) responsabilidade e compromisso da administração
          (i) O detentor de certificado definirá a sua política de segurança operacional de acordo com
os regulamentos aplicáveis e normas e métodos internacionais. Esta política deve ser assinada pelo
gestor responsável do detentor de certificado.
          (ii) A política de segurança operacional de refletir os compromissos da organização a
          Respeito da segurança operacional incluindo uma declaração clara do gestor responsável
acerca da provisão de recursos humanos e financeiros necessários para sua implantação. Esta
política será divulgada, com o endosso visível do gestor responsável, a toda organização.
          (iii) A política de segurança operacional será revista periodicamente pelo detentor de
certificado para assegurar que esta permaneça relevante e esteja apropriada à organização.
          (iv) O detentor de certificado deve assegurar-se que a política de segurança operacional
seja constante e apóie o cumprimento de todas as atividades da organização.
          (v) O detentor de certificado estabelecerá objetivos de segurança operacional, relacionados
com:
              (A) os indicadores de desempenho de segurança operacional;
              (B) as metas de desempenho de segurança operacional;
              (C) os requisitos de segurança operacional do SGSO.
              (vi) A política de segurança operacional, incluirá objetivos com respeito a:
              (A) o estabelecimento e manutenção de um SGSO eficaz e eficiente;
              (B) o compromisso de cumprir os padrões de segurança operacional e os requisitos
regulamentares;
              (C) o compromisso de manter os níveis mais altos de segurança operacional;
              (D) o compromisso de melhorar continuamente o nível de segurança operacional
alcançado;
              (E) o compromisso de identificar, gerenciar e mitigar os riscos de segurança
operacional;
              (F) o compromisso de incentivar a todo pessoal do detentor de certificado a reportar os
problemas de segurança operacional que permitam levar a cabo ações corretivas no lugar de ações
punitivas;
              (G) o estabelecimento de regras e informes claros e disponíveis que permitam a todo
pessoal envolver-se nos assuntos de segurança operacional
              (H) o compromisso de que todos os níveis da administração estarão dedicados a
segurança operacional;
              (I) o compromisso de manter a comunicação aberta com todo o pessoal sobre a
segurança operacional;
              (J) o compromisso de que todo pessoal relevante participará no processo de tomada de
decisões;
Origem: SSO                                                                        301/312
Data da emissão: 17 de março de 2010                                               RBAC nº 121
                                                                                   Emenda n° 00

              (K) o compromisso de prover treinamento necessário para criar e manter habilidades de
liderança relacionadas com a segurança operacional; e
              (L) o compromisso de que a segurança operacional dos empregados, passageiros e
terceiros será parte da estratégia do detentor de certificado.
       (2) Responsabilidade da direção acerca da segurança operacional.
          (i) O detentor de certificado designará um gestor responsável (RBAC 119.65(a)(6)), o qual,
independente de outras funções, deve ter a responsabilidade final, em nome do detentor de
certificado, para a implantação e manutenção do SGSO.
          (ii) O gestor responsável terá autoridade corporativa para assegurar que todas as atividades
de operações e de manutenção do detentor de certificado possam ser financiadas e realizadas com o
nível de segurança operacional requerido pela ANAC e estabelecido no SGSO da organização.
          (iii) o gestor responsável terá as seguintes responsabilidades:
              (A) estabelecer, manter e promover um SGSO eficaz;
              (B) gerenciar os recursos humanos e financeiros que permitam levar a cabo as
operações de voo de acordo com os requisitos regulamentares e o SGSO;
              (C) assegurar que todo o pessoal cumpra com a política do SGSO baseado em ações
corretivas e não punitivas;
              (D) assegurar que a política de segurança operacional seja compreendida, implementada
e mantida em todos os níveis da organização;
              (E) ter um conhecimento apropriado a respeito do SGSO e dos regulamentos de
operação;
              (F) assegurar que os objetivos e as metas sejam mensuráveis e realizáveis; e
              (G) tenha a responsabilidade final sobre todos os aspectos da segurança operacional da
organização.
              (H) o compromisso de informar à ANAC as ocorrências que indiquem desempenho
deficiente da segurança operacional, como dificuldades de serviço, ocorrências anormais,
ocorrências de solo, incidentes e acidentes aeronáuticos, consideradas como Eventos de Segurança
Operacional - ESO (Art. 30 e 67 do PSOE-ANAC), devem obrigatoriamente ser reportadas à
ANAC, independentemente de outras comunicações exigidas em regulamento específico. Acidentes
e incidentes devem ser reportados imediatamente. As demais ocorrências devem ser reportadas em
prazo não superior a sete dias. Para as emergências com aeronave que resultem em acionamento do
PRE ou PLEM do PSAC, o mesmo deverá enviar, também, um Relatório Inicial de Resposta a
Emergência (RIRE).
          (iv) O gestor responsável também identificará as responsabilidades de segurança
operacional de todos os membros do pessoal de direção requerido, que serão independentes de suas
funções principais.
          (v) As responsabilidades e atribuições do pessoal de direção requerido a respeito da
segurança operacional serão documentadas e comunicadas a toda organização.
          (vi) A indicação do gestor responsável deve ser aceita pela ANAC.
       (3) Designação do pessoal chave de segurança operacional
          (i) Para implantar e manter o SGSO, o detentor de certificado estabelecerá uma estrutura
de segurança operacional proporcional ao tamanho e complexidade da sua organização.
          (ii) O gestor responsável do detentor de certificado designará um diretor de segurança
operacional aceitável pela ANAC, com experiência suficiente, competência e qualificação
Origem: SSO                                                                        302/312
Data da emissão: 17 de março de 2010                                              RBAC nº 121
                                                                                  Emenda n° 00

adequada, o qual será responsável individualmente e ponto focal para a implantação e manutenção
de um SGSO efetivo.
          (iii) O diretor de segurança operacional terá as seguintes responsabilidades:
              (A) Assegurar que os processos necessários para o funcionamento efetivo do
              SGSO estejam estabelecidos, implementados e que sejam mantidos pelo detentor de
certificado;
              (B) assegurar que a documentação de segurança operacional reflita com precisão a
situação atual do explorador;
              (C) proporcionar orientação e direção para o funcionamento efetivo do SGSO do
detentor de certificado;
              (D) controlar a eficácia das medidas corretivas;
              (E) fomentar o SGSO através da organização;
              (F) apresentar informes periódicos ao gestor responsável sobre a eficácia da segurança
operacional e de qualquer oportunidade de melhora; e
              (G) prover assessoramento independente ao gestor responsável, aos outro membros
requeridos da administração [RBAC 119.65(a)] e outros membros da organização sobre questões
relacionadas com a segurança operacional do detentor de certificado.
          (iv) Para cumprir com suas responsabilidades e funções, o diretor de segurança operacional
deve ter as seguintes atribuições:
              (A) acesso direto ao gestor responsável e ao pessoal de direção requerido;
              (B) realizar auditorias de segurança operacional sobre qualquer aspecto das atividades
do detentor de certificado;
              (C) iniciar a investigação pertinente sobre qualquer acidente ou incidente em
conformidade com os procedimentos especificados no manual de gestão da segurança operacional
do detentor de certificado.
          (v) Para prover apoio ao diretor de segurança operacional e assegurar que o SGSO
funcione corretamente, o detentor de certificado designará uma comissão de segurança operacional
que se encontre no mais alto nível da função empresarial e seja composto por:
              (A) o gestor responsável, que a presidirá;
              (B) o diretor de segurança operacional que atuará como secretário;
              (C) os demais diretores ou gerentes da organização(RBAC 119.65(a));e
              (D) pessoal dos departamentos chaves da organização.
          (vi) A comissão de segurança operacional terá as seguintes responsabilidades:
              (A) assegurar que os objetivos e as ações especificadas no plano de segurança
operacional sejam atingidos nos prazos previstos;
              (B) supervisionar o desempenho da segurança operacional em relação à política e
objetivos planejados;
              (C) monitorar a eficácia do plano de implantação do SGSO da organização;
              (D) conhecer e assessorar o gestor responsável sobre questões de segurança operacional;
              (E) analisar o progresso da organização a respeito dos perigos identificados e das
medidas adotadas em face de acidentes e incidentes;


Origem: SSO                                                                       303/312
Data da emissão: 17 de março de 2010                                              RBAC nº 121
                                                                                  Emenda n° 00

             (F) monitorar que as ações de correção necessárias sejam realizadas de maneira
oportuna;
             (G) formular recomendações para ações e mitigação dos perigos identificados de
segurança operacional;
             (H) examinar os informes de auditorias internas de segurança operacional;
             (I) analisar e aprovar as respostas às auditorias e medidas adotadas;
             (J) ajudar a identificar perigos e defesas;
             (K) preparar e analisar informes sobre segurança operacional para o gestor responsável;
             (L) assegurar que os recursos apropriados sejam disponibilizados para a execução das
ações acordadas;
             (M) monitorar a eficiência da vigilância operacional das operações subcontratadas pela
organização; e
             (N) prover direção e orientação estratégica ao grupo de ação de segurança operacional.
         (vii) Para apoiar na avaliação dos riscos que a organização enfrente e sugerir os métodos
para mitigá-los, o gestor responsável designará um grupo de ação de segurança operacional que será
composto por:
             (A) o restante do pessoal de direção requerido (RBAC 119.65(a));
             (B) supervisores; e
             (C) e pessoal de área funcional apropriada.
         Nota: o trabalho do grupo de ação de segurança operacional da organização, será apoiado
mas não necessariamente dirigido pelo diretor de segurança operacional.
         (viii) O grupo de ação de segurança operacional terá pelo menos as seguintes
responsabilidades:
             (A) supervisionar a segurança operacional dentro das áreas funcionais;
             (B) assegurar que qualquer ação corretiva seja realizada de forma oportuna;
             (C) dar soluções aos perigos identificados;
             (D) levar a cabo avaliações de segurança operacional antes que o detentor de certificado
implemente mudanças operacionais, com o propósito de determinar o impacto que possam ter estas
mudanças na segurança operacional;
             (E) implantar os planos de ações corretivas;
             (F) assegurar a eficácia das recomendações prévias de segurança;
             (G) promover a participação de todo pessoal na segurança operacional; e
             (H) informar e aceitar a direção estratégica da comissão de segurança operacional da
organização.
      (4) Plano de implantação do SGSO
         (i) O detentor de certificado desenvolverá e manterá um plano de implantação do SGSO o
qual definirá a abordagem para gerenciar a segurança operacional de modo a satisfazer as
necessidades da organização.
         (ii) O gestor responsável designará um grupo de planejamento composto por diretores,
gerentes e supervisores chave da organização, para o desenho, desenvolvimento e implantação do
SGSO. O diretor de segurança operacional terá participação neste grupo.


Origem: SSO                                                                       304/312
Data da emissão: 17 de março de 2010                                              RBAC nº 121
                                                                                  Emenda n° 00

          (iii) O grupo de planejamento será responsável por elaborar uma estratégia e um plano de
implantação do SGSO que satisfará as necessidades da organização em matéria de segurança
operacional.
          (iv) O plano de implantação incluirá o seguinte:
              (A) política e objetivos de segurança operacional;
              (B) planejamento da segurança operacional;
              (C) descrição do sistema;
              (D) análise do que falta (―gap‖);
              (E) componentes do SGSO;
              (F) papéis e responsabilidades de segurança operacional;
              (G) política de reportes de segurança operacional;
              (H) meios de participação dos empregados;
              (I) capacitação em segurança operacional;
              (J) divulgação da segurança operacional;
              (K) medição do desempenho da segurança operacional;
              (L) revisão do desempenho da segurança operacional.
          (v) O detentor de certificado, como parte do desenvolvimento do plano de implantação do
SGSO, elaborará uma descrição de um sistema que inclua o seguinte:
              (A) as interações do SGSO com outros sistemas do sistema de aviação civil;
              (B) as funções do sistema;
              (C) as considerações de desempenho humano requeridas para a operação do sistema;
              (D) os componentes ―hardware‖ do sistema;
              (E) os componentes ―software‖ do sistema;
              (F) os procedimentos que definem as diretrizes para a operação e a utilização do
sistema;
              (G) o meio ambiente operacional; e
              (H) os produtos e serviços contratados ou adquiridos.
          (vi) O detentor de certificado deverá, como parte do desenvolvimento do plano de
implantação do SGSO, elaborar uma análise do faltante (―gap‖) para:
              (A) identificar as correções e as estruturas de segurança operacional que podem existir
na organização;
              (B) determinar as medidas adicionais de segurança operacional requeridas para
implantação e manutenção do SGSO da sua organização.
       (5) Coordenação do plano de resposta a emergências
          (i) O detentor de certificado desenvolverá, coordenará e manterá um plano de resposta a
emergências que assegure:
              (A) a transição ordenada e eficiente das operações normais às atividades de emergência;
              (B) a designação da autoridade em emergências;
              (C) as responsabilidades;
              (D) o retorno das atividades de emergência às operações normais do detentor de
certificado.
Origem: SSO                                                                       305/312
Data da emissão: 17 de março de 2010                                           RBAC nº 121
                                                                               Emenda n° 00

       (6) Documentação.
          (i) O detentor de certificado desenvolverá e manterá a documentação do SGSO. em papel
ou meio eletrônico o seguinte:
              (A) a política e objetivos de segurança operacional;
              (B) os requisitos de SGSO;
              (C) os procedimentos e processos do SGSO;
              (D) as responsabilidades e as pessoas que respondem pelos procedimentos e processos
do SGSO; e
              (E) os resultados do SGSO
          (ii) Como parte da documentação do SGSO e do manual de operações, o detentor de
certificado desenvolverá e manterá um manual de gerenciamento da segurança operacional
(MGSO), para divulgar as ações de segurança operacional a toda organização. Este manual,
adicionalmente, conterá o seguinte:
              (A) o alcance do SGSO;
              (B) uma descrição dos procedimentos para identificar perigos;
              (C) uma descrição dos procedimentos de avaliação e mitigação dos riscos;
              (D) uma descrição dos procedimentos de supervisão do desempenho da segurança
operacional
              (E) uma descrição dos procedimentos de melhoria contínua;
              (F) o procedimento do gerenciamento da mudança da organização;
              (G) uma descrição dos procedimentos de respostas a emergências e plano de
contingências; e
              (H) uma descrição dos procedimentos de promoção da segurança operacional.
   (e) Gerenciamento dos riscos de segurança operacional
       (1) Processos de identificação de perigos
          (i) O detentor de certificado desenvolverá e manterá um processo formal para coletar,
registrar, atuar e gerar retroalimentação acerca dos perigos nas operações, baseado em uma
combinação dos seguintes métodos de aquisição de dados;
              (A) reativos;
              (B) preventivos;
              (C) preditivos.
          (ii) Os meios formais de aquisição de dados de segurança operacional incluirão os
seguintes sistemas de reportes:
              (A) obrigatórios;
              (B) voluntários; e
              (C) confidenciais.
          (iii) O processo de identificação de perigos incluirá os seguintes passos:
              (A) reporte de perigos, eventos ou preocupações de segurança operacional;
              (B) aquisição e armazenamento de dados de segurança operacional;
              (C) análise dos dados de segurança operacional; e

Origem: SSO                                                                    306/312
Data da emissão: 17 de março de 2010                                             RBAC nº 121
                                                                                 Emenda n° 00

              (D) distribuição da informação de segurança operacional obtida dos dados de segurança
operacional.
       (2) Processos de avaliação e mitigação de riscos
          (i) O detentor de certificado de certificado desenvolverá e manterá um processo formal de
gestão de riscos que assegure:
              (A) a análise em termos de probabilidade e severidade de ocorrência
              (B) a avaliação em termos de tolerância; e
              (C) o controle em termos de mitigação dos riscos a um nível aceitável de segurança
operacional
          (ii) O detentor de certificado definirá os níveis de gestão, aceitáveis para a ANAC, para
tomar as decisões sobre a tolerância aos riscos de segurança operacional.
          (iii) O detentor de certificado definirá os controles de segurança para cada risco
determinado como tolerável.
   (f) Garantia da segurança operacional
       (1) Monitoramento e medição do desempenho da segurança operacional
          (i) O detentor de certificado desenvolverá e manterá os meios e procedimentos necessários
para:
              (A) verificar o desempenho da segurança operacional da organização em comparação
com as políticas e objetivos de segurança operacional; e
              (B) validar a eficácia dos controles de risco de segurança operacional implantados na
organização.
          (ii) O sistema de supervisão e medição de desempenho da segurança operacional incluirá o
seguinte:
              (A) reportes de segurança operacional;
              (B) auditorias independentes de segurança operacional;
              (C) pesquisas de segurança operacional;
              (D) revisões de segurança operacional;
              (E) estudos de segurança operacional; e
              (F) investigações internas de segurança operacional, que incluam eventos que não
requeiram ser reportados à ANAC.
          (iii) O detentor de certificado estabelecerá e manterá no MGSO:
              (A) os procedimentos de reporte de segurança operacional relacionados com o
desempenho da segurança operacional e monitoramento; e
              (B) indicará claramente que tipos de comportamentos operacionais são aceitáveis ou
inaceitáveis, incluindo as condições sob as quais se considerará a imunidade às medidas
disciplinares.
          (iv) O detentor de certificado estabelecerá, como parte do sistema de supervisão e medição
do desempenho da segurança operacional, procedimentos para auditorias independentes de
segurança operacional, com o propósito de:
                    (A) monitorar o cumprimento dos requisitos regulamentares;
                    (B) determinar se os procedimentos de operação são adequados;
                    (C) assegurar números apropriados de recursos humanos;
Origem: SSO                                                                      307/312
Data da emissão: 17 de março de 2010                                               RBAC nº 121
                                                                                   Emenda n° 00

                    (D) assegurar o cumprimento dos procedimentos e treinamentos;
                    (E) assegurar o nível de conhecimentos, treinamento e manutenção da
                    competência do pessoal.
          (v) O detentor de certificado poderá contratar outra organização ou pessoa com
conhecimentos técnicos aeronáuticos apropriados e com experiência demonstrada em auditorias,
que sejam aceitáveis pela ANAC, para realizar as auditorias independentes de segurança
operacional requeridas pelo parágrafo (iv) desta seção.
          (vi) O detentor de certificado estabelecerá, como parte do sistema de supervisão e medição
do desempenho da segurança operacional, um sistema de retroalimentação que assegure que o
pessoal responsável pelo gerenciamento do SGSO tome as medidas preventivas e corretivas
apropriadas e oportunas em resposta aos informes resultantes das auditorias independentes.
       (2) Gerenciamento da mudança
          (i) O detentor de certificado desenvolverá e manterá um processo formal para:
              (A) identificar as mudanças dentro da organização que possam afetar os processos e
serviços estabelecidos;
              (B) descrever os ajustes necessários para assegurar o desempenho da segurança
operacional antes de implantar as mudanças; e
              (C) eliminar ou modificar os controles de riscos de segurança operacional que já não
sejam necessários ou efetivos devido às mudanças produzidas no ambiente operacional.
       (3) Melhoria contínua do SGSO
          (i) O detentor de certificado estabelecerá e manterá um processo formal de:
              (A) identificação das causas do baixo desempenho;
              (B) determinação das implicações que podem causar um baixo desempenho nas
operações; e
              (C) eliminação das causas identificadas.
          (ii) O detentor de certificado estabelecerá um processo com procedimentos definidos no
MGSO para a melhoria contínua das operações de voo que inclua:
              (A) uma avaliação preventiva das instalações, equipamento, documentação e
procedimentos através de pesquisas e auditorias;
              (B) uma avaliação preventiva do desempenho individual do pessoal do detentor de
certificado para verificar o cumprimento das responsabilidades de segurança
              (C) uma avaliação reativa para verificar a eficácia dos sistemas de controle e mitigação
dos riscos, incluindo, por exemplo: investigações de acidentes, incidentes e eventos significativos.
   (g) Promoção da segurança operacional.
       (1) Treinamento e qualificação.
          (i) O detentor de certificado desenvolverá e manterá um programa de treinamento de
segurança operacional que assegure que o pessoal esteja adequadamente qualificado e seja
competente para desempenhar as funções atribuídas segundo o SGSO.
          (ii) O alcance da qualificação de segurança operacional será apropriada a participação da
pessoa no SGSO da organização.
          (iii) Considerando que é essencial que o pessoal de direção da organização compreenda o
SGSO, o detentor de certificado proverá capacitação a este pessoal no seguinte:
              (A) princípios do SGSO;
Origem: SSO                                                                        308/312
Data da emissão: 17 de março de 2010                                               RBAC nº 121
                                                                                   Emenda n° 00

            (B) suas obrigações e responsabilidades;
            (C) aspectos legais pertinentes (exemplo: as respectivas responsabilidades perante a lei).
         (iv) O currículo de treinamento inicial de segurança operacional para todo o pessoal do
detentor de certificado cobrirá, pelo menos, o seguinte:
            (A) princípios básicos de gerenciamento da segurança operacional;
            (B) filosofia, políticas e normas de segurança operacional da organização (incluindo o
enfoque da organização com respeito às medidas disciplinares e aos problemas de segurança
operacional, a natureza integral do gerenciamento da segurança operacional, a tomada de decisões
sobre gestão de riscos, a cultura de segurança operacional, etc.);
            (C) a importância da observação da política de segurança operacional e os
procedimentos que compõem o SGSO;
            (D) a organização, funções e responsabilidades do pessoal em relação à segurança
operacional;
            (E) antecedentes da segurança operacional da organização, incluindo as debilidades
sistemáticas;
            (F) metas e objetivos de segurança operacional da organização;
            (G) processos de identificação de perigos;
            (H) processos de avaliação e mitigação de riscos;
            (I) monitoramento e medição do desempenho de segurança operacional;
            (J) gerenciamento da mudança;
            (K) melhoria contínua do gerenciamento da segurança operacional;
            (L) programas de gerenciamento da segurança operacional da organização exemplo:
sistemas de notificação de incidentes, auditoria da segurança das operações de rota (LOSA),
programa de garantia da qualidade de operações de voo (FOQA), pesquisa sobre a segurança das
operações normais (NOSS);
            (M) requisito de avaliação interna contínua do desempenho da segurança operacional na
organização (exemplo: pesquisa com os empregados, auditorias e avaliações de segurança
operacional);
            (N) notificação de acidentes, incidentes e perigos;
            (O) canais de comunicação para os fins da segurança operacional;
            (P) retorno da informação e métodos de comunicação para a difusão da informação de
segurança operacional;
            (Q) auditorias de segurança operacional;
            (R) plano de resposta a emergências; e
            (S) promoção da segurança operacional e difusão da informação.
         (v) Além do currículo de treinamento inicial, o detentor de certificado proverá instrução ao
pessoal de operações nos seguintes temas:
            (A) procedimentos para notificação de acidentes e incidentes;
            (B) perigos específicos enfrentados pelo pessoal de operações;
            (C) procedimentos para notificação de perigos;
            (D) iniciativas específicas de segurança operacional; tais como:
                ( 1 ) programa de análise de dados de voo (FDA);
Origem: SSO                                                                        309/312
Data da emissão: 17 de março de 2010                                            RBAC nº 121
                                                                                Emenda n° 00

                 ( 2 ) programa de garantia da qualidade de operações de voo (FOQA)
                 ( 3 ) programa LOSA; e
                 ( 4 ) programa NOSS.
             (E) comissões de segurança operacional;
             (F) perigos para a segurança operacional por mudança das estações e procedimentos
operacionais (operações de inverno, etc.); e
             (G) procedimentos de emergências;
         (vi) O detentor de certificado proverá treinamento ao gerente de segurança operacional,
pelo menos, nos seguintes itens:
             (A) familiarização com as diferentes aeronaves, tipos de operação, rotas, etc.;
             (B) compreensão da função da atuação humana nas causas de acidentes e a prevenção
dos mesmos;
             (C) funcionamento do SGSO;
             (D) investigação de acidentes e incidentes;
             (E) gerenciamento de crise e planejamento da reposta a emergências;
             (F) promoção da segurança operacional;
             (G) técnicas de comunicação;
             (H) gerenciamento da base de dados da segurança operacional;
             (I) treinamento ou familiarização especializada no gerenciamento de recursos de cabine
(CRM), FDA, LOSA FOQA e NOSS.
      (2) Difusão de informação acerca da segurança operacional
         (i) O detentor de certificado desenvolverá e manterá meios formais para a difusão e
comunicação da segurança operacional, de forma que possa:
             (A) assegurar que todo pessoal esteja informado do SGSO;
             (B) transmitir informação crítica sobre segurança operacional;
             (C) assegurar o desenvolvimento e manutenção de uma cultura positiva de segurança
operacional na organização;
             (D) explicar porque são tomadas ações específicas de segurança operacional;
             (E) explicar porque são introduzidos ou modificados os procedimentos de segurança
operacional; e
             (F) transmitir informação genérica de segurança operacional.
         (ii) Os meios formais de comunicação de segurança operacional podem incluir: boletins
operacionais, circulares, publicações oficiais, páginas da web, etc.




Origem: SSO                                                                     310/312
Data da emissão: 17 de março de 2010                                             RBAC nº 121
                                                                                 Emenda n° 00

  APÊNDICE R – FASES DE IMPLANTAÇÃO DO SISTEMA DE GERENCIAMENTO DA
                                  SEGURANÇA OPERACIONAL
   (a) A partir de 1° de maio de 2010, o detentor de certificado se utilizará de quatro fases para a
implantação do sistema de gerenciamento da segurança operacional (SGSO). Cada fase terá a
duração de um ano. A seguir serão detalhadas as atividades a serem cumpridas em cada uma delas.
   (b) Na Fase 1, até 1° de maio 2011, o detentor de certificado apresentará uma proposta de como
os requisitos do SGSO serão alcançados e integrados às atividades diárias da organização, e um
quadro de responsabilidades para a implantação do SGSO. Além disso:
      (1) identificará o gestor responsável e as responsabilidades de segurança operacional dos
outros membros da direção (Apêndice Q, parágrafos (d)(2) e (d)(3));
      (2) identificará dentro da organização, a pessoa ou grupo de planejamento que será
responsável pela implantação o SGSO (Apêndice Q, (d)(4)(i) e (ii))
      (3) descreverá seu SGSO;
      (4) realizará uma análise do faltante (―gap‖) dos recursos existentes comparados com os
requisitos estabelecidos no Apêndice Q deste regulamento para a implantação do SGSO (Apêndice
Q, (d)(4)(iv));
      (5) desenvolverá o plano de implantação do SGSO, que explique como a organização
implantará o SGSO baseado nos requisitos nacionais e normas e métodos recomendados
internacionais, a descrição do sistema e os resultados da análise do faltante (Apêndice Q, (d)(4))
      (6) desenvolverá a documentação relativa à política e aos objetivos de segurança operacional
(Apêndice Q, (d)(6)(i)); e
      (7) desenvolverá e estabelecerá os meios de comunicação e difusão da segurança operacional
(Apêndice Q, (g)(2))
   (c) Na Fase 2, até 1°de maio de 2012, o detentor de certificado:
      (1) colocará em prática os itens que compreendem o plano de implantação do SGSO
(Apêndice Q, (d)(4))
      (2) implantará os processos reativos do gerenciamento de riscos de segurança operacional
(Apêndice Q, (e)) relacionados com:
         (i) a identificação de perigos; e
         (ii) a avaliação e mitigação dos riscos.
      (3) proverá treinamento relativo ao plano de implantação do SGSO e aos processos reativos
do gerenciamento dos riscos de segurança operacional; e
      (4) desenvolverá a documentação relacionada com o plano de implantação do SGSO e dos
processos reativos do gerenciamento de riscos da segurança operacional (Apêndice Q, (d)(6))
   (d) Na Fase 3, até 1° de maio de 2013, o detentor de certificado:
      (1) implantará os processos preventivos (pró-ativos) e preditivos do gerenciamento de riscos
da segurança operacional (Apêndice Q, (e)), relacionados com:
         (i) a identificação de perigos; e
         (ii) a avaliação e mitigação de riscos.
      (2) proverá treinamento relativo aos processos preventivos e preditivos do gerenciamento dos
riscos de segurança operacional (Apêndice Q, (g)(1));
      (3) desenvolverá a documentação relacionada com os processos preventivos e preditivos do
gerenciamento de riscos de segurança operacional (Apêndice Q, (d)(6));
Origem: SSO                                                                      311/312
Data da emissão: 17 de março de 2010                                          RBAC nº 121
                                                                              Emenda n° 00

   (e) Na Fase 4, até 1° de maio de 2014, o detentor de certificado:
      (1) implantará a garantia da segurança operacional, desenvolvendo (Apêndice Q, (f)):
         (i) os níveis aceitáveis de segurança operacional;
         (ii) os indicadores e metas de desempenho; e
         (iii) o processo de melhoria contínua do SGSO.
      (2) desenvolverá e implantará a garantia da segurança operacional (Apêndice Q, (f));
      (3) proverá treinamento relacionado com a garantia da segurança operacional e o plano de
respostas a emergências (Apêndice Q, (g)(1)); e
      (4) desenvolverá a documentação relativa à garantia da segurança operacional e ao plano de
resposta a emergências (Apêndice Q, (d)(6)).




Origem: SSO                                                                   312/312
