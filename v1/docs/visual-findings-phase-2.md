# Validação visual — Fase 2

As telas `/protocolos` e `/auditoria` foram renderizadas em Chromium headless. A tela de protocolo usou viewport de 1440 × 1700 pixels; a tela de auditoria usou 1440 × 1100 pixels.

A tela de protocolo preserva integralmente a Shell unificada, incluindo sidebar, top bar, ícones dos aplicativos e contexto da organização. O fluxo funcional expõe criação, nível de acesso, hipótese legal, dado pessoal, timeline, solicitação e decisão de vista, além da consulta pública. Os controles ocupam a largura disponível, os botões desabilitados têm estado visível e o botão de negação usa a cor de perigo do design system.

A tela de auditoria preserva a mesma Shell e apresenta ações claras para carregar a trilha, verificar a cadeia e exportar a prova Merkle. A tabela e o formulário de contexto permanecem legíveis. Não foram observadas sobreposições, rolagem horizontal indevida, textos estruturalmente cortados ou falhas de carregamento federado.

A primeira ampliação do conjunto de utilitários Tailwind revelou interferência no breakpoint da Shell. O design system foi corrigido para compilar também as classes da Shell, mantendo consistência entre host e remote federado.
