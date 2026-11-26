# ADR — Chaves e modelos dos provedores de IA

**Status:** SUBSTITUÍDO em 2026-11-19 (ver "Revisão" no fim) · **Data original:** 2026-11-18

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


---

## Revisão (2026-11-19) — painel editável, como o do Clubinho
O usuário pediu explicitamente o painel de gerenciamento da LLM (ChatGPT e Gemini) **igual ao do Clubinho**,
o que reverte os itens 1 e 3 da decisão acima. O que vale agora:

1. **As chaves podem ser salvas pelo painel** (`/adm/config-provedores-ia`, só admin, flags `content_studio` +
   `content_studio_provider_admin`), na tabela `ai_provider_settings`, **sempre cifradas** com AES-256-GCM
   (`enc:v2:`, HKDF, o nome do provedor entra como AAD). A chave-mestra fica no ambiente
   (`AI_PROVIDER_SETTINGS_ENCRYPTION_KEY`, com `_PREVIOUS` para rotação) — o dump do banco sozinho não abre as chaves.
2. **Nenhuma resposta da API devolve a chave** (nem cifrada): só `hasApiKey`. Valor já cifrado (`enc:`) é recusado na entrada.
3. **Divergência intencional do Clubinho:** lá só a produção recusa salvar chave sem chave-mestra; aqui qualquer
   ambiente fora do `local` recusa (dev e staging também têm banco que circula). No `local` sem chave-mestra o valor fica em texto puro.
4. O Estúdio usa o que o painel salvou (provedor ativo, chave, modelo de texto e de imagem) **na próxima geração, sem reiniciar**;
   sem chave salva para o provedor, continua valendo o ambiente (`CONTENT_STUDIO_*`). `AI_PROVIDER_MODE=fake` (fora de produção) vence tudo.
5. O ponto 2 da decisão original (seleção por ambiente) vira **fallback**, não mais a única via.

### Consequências
- Perder a chave-mestra = ter de digitar as chaves de novo no painel (o painel avisa quando uma chave salva está ilegível).
- Trocar de provedor ou de modelo deixa de exigir deploy.
- A tabela `ai_provider_settings` existe (migration `AddAiProviderSettings`).
