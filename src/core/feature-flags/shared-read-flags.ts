import { FeatureFlagKeys } from "./enums/feature-flag-keys.enum";

/**
 * Leituras de apoio (listas de abrigos, equipes, líderes, membros e usuários para
 * seletores) servem a vários recursos. Ficam atrás de `anyOf`: respondem enquanto
 * ao menos um dos recursos que as consomem estiver ligado e deixam de responder
 * quando todos estiverem desligados.
 */
export const SHELTER_DIRECTORY_FLAGS = {
  anyOf: [
    FeatureFlagKeys.SHELTER_MANAGEMENT,
    FeatureFlagKeys.SHELTERED_MANAGEMENT,
    FeatureFlagKeys.SHELTERED_AREA,
    FeatureFlagKeys.PAGELAS_MANAGEMENT,
    FeatureFlagKeys.ATTENDANCE_CONTROL,
    FeatureFlagKeys.SHELTER_SCHEDULE,
    FeatureFlagKeys.VISIT_REPORTS,
    FeatureFlagKeys.MEMBER_MANAGEMENT,
    FeatureFlagKeys.LEADER_MANAGEMENT,
    FeatureFlagKeys.USER_MANAGEMENT,
    FeatureFlagKeys.PROFILE_MANAGEMENT,
    FeatureFlagKeys.CRIMINAL_RECORDS,
    FeatureFlagKeys.SHELTER_FEED,
    FeatureFlagKeys.SHELTER_PHOTO_UPLOAD,
    FeatureFlagKeys.PHOTO_MODERATION,
  ],
} as const;
