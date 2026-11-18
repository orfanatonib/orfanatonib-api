import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";
import { RouteModule } from "./infrastructure/route/route.module";
import { UserModule } from "./core/user/user.module";
import { AuthModule } from "./core/auth/auth.module";
import { AwsModule } from "./infrastructure/aws/aws.module";
import { EmailModule } from "./infrastructure/email/email.module";
import { DatabaseModule } from "../database/database.module";
import { MeditationModule } from "./content/meditation/meditation.module";
import { ImageModule } from "./content/page/image-page/image-page.module";
import { VideosPageModule } from "./content/page/video-page/video-page.module";
import { VisitMaterialsPageModule } from "./content/page/visit-material-page/visit-material-page.module";
import { ContactModule } from "./communication/contact/contact.module";
import { NotificationModule } from "./communication/notification/notification.module";
import { EventModule } from "./content/event/event.module";
import { CommentModule } from "./communication/comment/comment.module";
import { DocumentModule } from "./content/document/documents.module";
import { IdeasPageModule } from "./content/page/ideas-page/ideas-page.module";
import { InformativeModule } from "./content/informative/informative.module";
import { ImageSectionModule } from "./content/page/image-section/image-section.module";
import { IdeasSectionModule } from "./content/page/ideas-section/ideas-section.module";
import { SiteFeedbackModule } from "./communication/feedback/site-feedback.module";
import { AddressesModule } from "./shelter/address/addresses.module";
import { LeaderProfilesModule } from "./shelter/leader-profile/leader-profiles.module";
import { MemberProfilesModule } from "./shelter/member-profile/member-profiles.module";
import { SheltersModule } from "./shelter/shelter/shelters.module";
import { ShelteredModule } from "./shelter/sheltered/sheltered.module";
import { PagelasModule } from "./shelter/pagela/pagelas.module";
import { AcceptedChristsModule } from "./shelter/accepted-christ/accepted-christs.module";
import { TeamsModule } from "./shelter/team/teams.module";
import { ShelterScheduleModule } from "./shelter/schedule/shelter-schedule.module";
import { VisitReportModule } from "./shelter/visit-report/visit-report.module";
import { AttendanceModule } from "./shelter/attendance/attendance.module";
import { ProfileModule } from "./core/profile/profile.module";
import { FeatureFlagsModule } from "./core/feature-flags/feature-flags.module";
import { IntegrationModule } from "./shelter/integration/integration.module";
import { AtendenteModule } from "./shelter/atendente/atendente.module";
import { RemindersModule } from "./shelter/reminders/reminders.module";
import { ContentStudioModule } from "./content/studio/content-studio.module";
import { GlobalExceptionFilter } from "./common/filters";
import { RateLimitingMiddleware } from "./common/middlewares/rate-limiting.middleware";
import { RequestContextModule } from "./core/request-context";
import { HealthModule } from "./common/controllers/health.module";
import { validateEnv } from "./config/env.validation";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import * as path from "path";

function getEnvFilePath(): string {
  const env = process.env.ENVIRONMENT || process.env.NODE_ENV || "local";
  const envFileMap: Record<string, string> = {
    local: "env/local.env",
    staging: "env/staging.env",
    production: "env/prod.env",
    prod: "env/prod.env",
  };
  return path.resolve(process.cwd(), envFileMap[env] || envFileMap.local);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
      // Falha o boot com a lista de variáveis ausentes/inválidas (sem ecoar valores).
      validate: validateEnv,
    }),
    // Agendador: fila de saída de e-mail e lembretes periódicos.
    ScheduleModule.forRoot(),
    DatabaseModule,
    AwsModule,
    EmailModule,
    NotificationModule,
    ImageModule,
    RouteModule,
    UserModule,
    AuthModule,
    VideosPageModule,
    VisitMaterialsPageModule,
    MeditationModule,
    ContactModule,
    EventModule,
    CommentModule,
    DocumentModule,
    IdeasPageModule,
    InformativeModule,
    ImageSectionModule,
    IdeasSectionModule,
    SiteFeedbackModule,
    AddressesModule,
    LeaderProfilesModule,
    MemberProfilesModule,
    SheltersModule,
    ShelteredModule,
    PagelasModule,
    AcceptedChristsModule,
    TeamsModule,
    ShelterScheduleModule,
    VisitReportModule,
    AttendanceModule,
    ProfileModule,
    FeatureFlagsModule,
    IntegrationModule,
    AtendenteModule,
    RemindersModule,
    ContentStudioModule,
    HealthModule,
    RequestContextModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registrado por DI (antes era `new` em main.ts): recebe o contexto da requisição e a configuração.
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  /**
   * Limitação de taxa é OPT-IN (`RATE_LIMIT_ENABLED=true`): atrás de proxy/balanceador
   * defina também `TRUST_PROXY_HOPS`, senão todos os usuários compartilham o IP do proxy.
   */
  configure(consumer: MiddlewareConsumer): void {
    if (process.env.RATE_LIMIT_ENABLED === "true") {
      consumer.apply(RateLimitingMiddleware).forRoutes("*");
    }
  }
}
