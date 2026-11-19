import { AcceptedChristEntity } from "../src/shelter/accepted-christ/entities/accepted-christ.entity";
import { AddressEntity } from "../src/shelter/address/entities/address.entity/address.entity";
import { AtendenteEntity } from "../src/shelter/atendente/entities/atendente.entity";
import { AttendanceEntity } from "../src/shelter/attendance/entities/attendance.entity";
import { CommentEntity } from "../src/communication/comment/entities/comment.entity";
import { ContactEntity } from "../src/communication/contact/contact.entity";
import { DayEntity } from "../src/content/meditation/entities/day.entity";
import { DocumentEntity } from "../src/content/document/entities/document.entity";
import { EmailOutboxEntity } from "../src/communication/notification/outbox/email-outbox.entity";
import { EmailVerificationTokenEntity } from "../src/core/auth/entities/email-verification-token.entity";
import { EventEntity } from "../src/content/event/entities/event.entity";
import { FeatureFlagEntity } from "../src/core/feature-flags/entities/feature-flag.entity";
import { IdeasPageEntity } from "../src/content/page/ideas-page/entities/ideas-page.entity";
import { IdeasSectionEntity } from "../src/content/page/ideas-section/entities/ideas-section.entity";
import { ImagePageEntity } from "../src/content/page/image-page/entities/image-page.entity";
import { ImageSectionEntity } from "../src/content/page/image-page/entities/image-section.entity";
import { InformativeEntity } from "../src/content/informative/entities/informative.entity";
import { IntegrationEntity } from "../src/shelter/integration/entities/integration.entity";
import { LeaderProfileEntity } from "../src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { MediaItemEntity } from "../src/shared/media/media-item/media-item.entity";
import { MediaCleanupQueueEntity } from "../src/shared/media/storage/media-cleanup-queue.entity";
import { MeditationEntity } from "../src/content/meditation/entities/meditation.entity";
import { MemberProfileEntity } from "../src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { PagelaEntity } from "../src/shelter/pagela/entities/pagela.entity";
import { PasswordResetTokenEntity } from "../src/core/auth/entities/password-reset-token.entity";
import { PersonalData } from "../src/core/profile/entities/personal-data.entity";
import { RouteEntity } from "../src/infrastructure/route/route-page.entity";
import { ShelterEntity } from "../src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { ShelterScheduleEntity } from "../src/shelter/schedule/entities/shelter-schedule.entity";
import { ShelteredEntity } from "../src/shelter/sheltered/entities/sheltered.entity";
import { SiteFeedbackEntity } from "../src/communication/feedback/entity/site-feedback.entity";
import { TeamEntity } from "../src/shelter/team/entities/team.entity";
import { UserEntity } from "../src/core/user/entities/user.entity";
import { UserPreferences } from "../src/core/profile/entities/user-preferences.entity";
import { VideosPage } from "../src/content/page/video-page/entities/video-page.entity";
import { VisitMaterialsPageEntity } from "../src/content/page/visit-material-page/entities/visit-material-page.entity";
import { VisitReportEntity } from "../src/shelter/visit-report/entities/visit-report.entity";
import { AiProviderSettingEntity } from "../src/content/ai-lessons/entities/ai-provider-setting.entity";
import { ContentPackageEntity } from "../src/content/studio/entities/content-package.entity";
import { ContentTrackEntity } from "../src/content/studio/entities/content-track.entity";
import { ContentStageEntity } from "../src/content/studio/entities/content-stage.entity";
import { ContentVersionEntity } from "../src/content/studio/entities/content-version.entity";
import { ContentGenerationJobEntity } from "../src/content/studio/entities/content-generation-job.entity";
import { ContentAssetEntity } from "../src/content/studio/entities/content-asset.entity";
import { ContentPromptPreferenceEntity } from "../src/content/studio/entities/content-prompt-preference.entity";
import { ContentReviewCommentEntity } from "../src/content/studio/entities/content-review-comment.entity";
import { ContentPublicationEntity } from "../src/content/studio/entities/content-publication.entity";
import { ContentReviewDecisionEntity } from "../src/content/studio/entities/content-review-decision.entity";

export const DATABASE_ENTITIES = [
  EventEntity,
  ImagePageEntity,
  ImageSectionEntity,
  RouteEntity,
  UserEntity,
  VideosPage,
  VisitMaterialsPageEntity,
  MeditationEntity,
  DayEntity,
  MediaItemEntity,
  MediaCleanupQueueEntity,
  ContactEntity,
  CommentEntity,
  DocumentEntity,
  IdeasPageEntity,
  IdeasSectionEntity,
  InformativeEntity,
  SiteFeedbackEntity,
  ShelterEntity,
  MemberProfileEntity,
  LeaderProfileEntity,
  AddressEntity,
  ShelteredEntity,
  PagelaEntity,
  AcceptedChristEntity,
  TeamEntity,
  ShelterScheduleEntity,
  AttendanceEntity,
  PersonalData,
  UserPreferences,
  FeatureFlagEntity,
  PasswordResetTokenEntity,
  IntegrationEntity,
  VisitReportEntity,
  AtendenteEntity,
  EmailOutboxEntity,
  EmailVerificationTokenEntity,
  AiProviderSettingEntity,
  ContentPackageEntity,
  ContentTrackEntity,
  ContentStageEntity,
  ContentVersionEntity,
  ContentGenerationJobEntity,
  ContentAssetEntity,
  ContentReviewCommentEntity,
  ContentPromptPreferenceEntity,
  ContentPublicationEntity,
  ContentReviewDecisionEntity,
];
