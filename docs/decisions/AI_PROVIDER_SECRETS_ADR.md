# ADR — Chaves e modelos dos provedores de IA

**Status:** aceito · **Data:** 2026-11-18

## Contexto
O Estúdio de conteúdo chama provedores externos (OpenAI, Gemini). O pedido original era um painel
editável como o do Clubinho, que guarda a chave cifrada (AES-256-GCM) numa tabela `ai_provider_settings`.
O plano `003` do Estúdio dizia o contrário: o banco só guarda **referência** ao segredo.

## Decisão
1. **Segredos ficam fora do banco.** As chaves continuam em variáveis de ambiente / gerenciador de
   segredos (`CONTENT_STUDIO_OPENAI_API_KEY`, `CONTENT_STUDIO_GEMINI_API_KEY`).
   Motivo: um dump do MySQL ou uma falha de leitura em endpoint admin não pode vazar chave de provedor
   com cobrança; a rotação cifrada exigiria uma chave-mestra que também teria de viver no ambiente — o ganho
   de segurança seria pequeno e o risco operacional (perder a chave-mestra) é alto.
2. **Seleção por configuração:** `CONTENT_STUDIO_AI_PROVIDER` (`openai` | `gemini`), allowlist de modelos
   por provedor (`*_TEXT_MODELS`, `*_IMAGE_MODELS`) e `AI_PROVIDER_MODE=fake` apenas fora de produção.
3. **O painel é somente leitura** (já existente): mostra provedor ativo, modelos permitidos e saúde.
   Mudar chave/modelo é uma mudança de deploy (auditável), não de tela.
4. Se no futuro for necessário trocar modelo sem deploy, o que pode ir para o banco é a **escolha do modelo**
   dentro da allowlist (não segredo), com auditoria.

## Consequências
- Nenhuma tabela nova nem migration de segredos; o plano 43 fecha sem `ai_provider_settings`.
- Trocar de provedor ou modelo exige redeploy/reinício; em troca, a chave nunca passa por API, log ou banco.
