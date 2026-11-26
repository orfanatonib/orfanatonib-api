# Rotas dinâmicas (`/routes`)

Páginas criadas no painel (galeria, vídeos, materiais, ideias, página de abrigo, dias de meditação) viram uma **rota** consumida pelo front para montar menu, cards e URLs.

| Endpoint | Quem | Resposta |
|---|---|---|
| `GET /routes` | visitante: só rotas `public`; com sessão: todas | `RouteResponseDto[]` |
| `GET /routes/:id` | idem; rota não pública para visitante é **404** (não revela que existe) | `RouteResponseDto` |
| `GET /routes/orphans/check` | admin | contagem/lista de rotas cuja entidade não existe mais |
| `POST /routes/orphans/cleanup` | admin | apaga **só** as órfãs (nunca uma rota viva); idempotente |

- `RouteResponseDto` (`dto/route-response.dto.ts`) é o contrato; a entidade não é devolvida.
- `entityType` é o tipo de PÁGINA para o front (`ImagesPage`, `VideosPage`, `VisitMaterialsPage`, `IdeasPage`, `shelterPage`) mais `RouteEntityType.MeditationDay` — não confundir com `MediaTargetType` (de que entidade é a mídia).
- No front, `ROUTE_TYPE_FLAG`/`useVisibleRoutes` escondem rota de tipo cuja flag está desligada; tipo desconhecido ou rota inexistente cai na página 404 (`NotFoundPage`), nunca em texto técnico.
- Sem flag própria: o núcleo de rotas não tem interruptor.

Testes: `route.controller.spec.ts`, `route.service.spec.ts`, `cleanup-orphan-routes.service.spec.ts`; E2E `e2e/live/dynamic-routes` (API 21 cenários + UI), matriz `dynamic-routes` 22/22.
