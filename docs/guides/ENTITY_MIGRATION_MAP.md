# De-para: entidades TypeORM × migrations

Gerado em 2026-11-23 a partir de `DATABASE_ENTITIES` (53 entidades) contra `ReleaseBaseline1795459200000` e `LegacyProductionUpgrade1795459199000`.

- **Baseline** (`database/migrations/1795459200000-ReleaseBaseline.ts`): cria as 53 tabelas num banco vazio.
- **Adoção legada** (`database/adoption/1795459199000-LegacyProductionUpgrade.ts`): leva o schema de produção (35 tabelas, sem `typeorm_migrations`) ao schema atual; depois a baseline é só registrada (fake).
- **Políticas de dados** (`1795459201000`): renomeia a flag de integração e força páginas de ideias privadas; roda sempre.
- Resultado verificado: `createSchemaBuilder().log()` retorna 0 operações após a adoção; contagem de linhas das 35 tabelas existentes idêntica antes/depois.

| Entidade | Tabela | Na baseline | Na produção atual |
|---|---|---|---|
| AcceptedChristEntity | `accepted_christs` | sim | sim — alterada pela adoção |
| AddressEntity | `addresses` | sim | sim — sem mudança |
| AiProviderSettingEntity | `ai_provider_settings` | sim | não — criada pela adoção |
| AtendenteEntity | `atendentes` | sim | sim — sem mudança |
| AttendanceEntity | `attendance_records` | sim | sim — sem mudança |
| CommentEntity | `comments` | sim | sim — sem mudança |
| ContactEntity | `contacts` | sim | sim — sem mudança |
| ContentAssetEntity | `content_assets` | sim | não — criada pela adoção |
| ContentGenerationJobEntity | `content_generation_jobs` | sim | não — criada pela adoção |
| ContentPackageEntity | `content_packages` | sim | não — criada pela adoção |
| ContentPromptPreferenceEntity | `content_prompt_preferences` | sim | não — criada pela adoção |
| ContentPublicationEntity | `content_publications` | sim | não — criada pela adoção |
| ContentReviewCommentEntity | `content_review_comments` | sim | não — criada pela adoção |
| ContentReviewDecisionEntity | `content_review_decisions` | sim | não — criada pela adoção |
| ContentStageEntity | `content_stages` | sim | não — criada pela adoção |
| ContentTrackEntity | `content_tracks` | sim | não — criada pela adoção |
| ContentVersionEntity | `content_versions` | sim | não — criada pela adoção |
| DocumentEntity | `documents` | sim | sim — sem mudança |
| EmailOutboxEntity | `email_outbox` | sim | não — criada pela adoção |
| EmailVerificationTokenEntity | `email_verification_tokens` | sim | não — criada pela adoção |
| EventEntity | `events` | sim | sim — sem mudança |
| FeatureFlagEntity | `feature_flags` | sim | sim — alterada pela adoção |
| IdeasPageEntity | `ideas_pages` | sim | sim — sem mudança |
| IdeasSectionEntity | `ideas_sections` | sim | sim — sem mudança |
| ImagePageEntity | `image_pages` | sim | sim — sem mudança |
| ImageSectionCelebrationEntity | `image_section_celebrations` | sim | não — criada pela adoção |
| ImageSectionCommentEntity | `image_section_comments` | sim | não — criada pela adoção |
| ImageSectionEntity | `image_sections` | sim | sim — alterada pela adoção |
| InboxNotificationEntity | `inbox_notifications` | sim | não — criada pela adoção |
| InformativeEntity | `informatives` | sim | sim — sem mudança |
| IntegrationEntity | `integrations` | sim | sim — sem mudança |
| LeaderProfileEntity | `leader_profiles` | sim | sim — sem mudança |
| leader_teams | `leader_teams` | sim | sim — sem mudança |
| MediaCleanupQueueEntity | `media_cleanup_queue` | sim | não — criada pela adoção |
| MediaItemEntity | `media_items` | sim | sim — alterada pela adoção |
| DayEntity | `meditation_days` | sim | sim — sem mudança |
| MeditationEntity | `meditations` | sim | sim — sem mudança |
| MemberProfileEntity | `member_profiles` | sim | sim — sem mudança |
| PagelaEntity | `pagelas` | sim | sim — sem mudança |
| PasswordResetTokenEntity | `password_reset_tokens` | sim | sim — sem mudança |
| PersonalData | `personal_data` | sim | sim — sem mudança |
| RouteEntity | `routes` | sim | sim — sem mudança |
| ShelterScheduleEntity | `shelter_schedules` | sim | sim — sem mudança |
| ShelteredEntity | `sheltered` | sim | sim — sem mudança |
| ShelterEntity | `shelters` | sim | sim — sem mudança |
| SiteFeedbackEntity | `site_feedbacks` | sim | sim — sem mudança |
| TeamEntity | `teams` | sim | sim — sem mudança |
| UserPreferences | `user_preferences` | sim | sim — sem mudança |
| UserEntity | `users` | sim | sim — alterada pela adoção |
| VideosPage | `videos_pages` | sim | sim — sem mudança |
| VisitMaterialsPageEntity | `visit_material_pages` | sim | sim — alterada pela adoção |
| VisitMaterialSectionEntity | `visit_material_sections` | sim | não — criada pela adoção |
| VisitReportEntity | `visit_reports` | sim | sim — sem mudança |
