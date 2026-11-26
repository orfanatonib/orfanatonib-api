import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProfileController } from "./controllers/profile.controller";
import { CreateProfileService } from "./services/profile/create-profile.service";
import { GetAllProfilesService } from "./services/profile/get-all-profiles.service";
import { GetOneProfileService } from "./services/profile/get-one-profile.service";
import { UpdateProfileService } from "./services/profile/update-profile.service";
import { UserRepository } from "../user/user.repository";
import { ProfilesQueryRepository } from "./repositories/profiles-query.repository";
import { PersonalDataRepository } from "./repositories/personal-data.repository";
import { UserPreferencesRepository } from "./repositories/user-preferences.repository";
import { ProfileWriteRepository } from "./repositories/profile-write.repository";
import { UserEntity } from "../user/entities/user.entity";
import { PersonalData } from "./entities/personal-data.entity";
import { UserPreferences } from "./entities/user-preferences.entity";
import { MediaModule } from "../../shared/media/media.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, PersonalData, UserPreferences]),
    // Ciclo real com AuthModule: o perfil usa os guards do auth e o
    // `GET /auth/me` usa o contrato do perfil. Os dois lados usam forwardRef.
    forwardRef(() => AuthModule),
    MediaModule,
  ],
  controllers: [ProfileController],
  providers: [
    CreateProfileService,
    GetAllProfilesService,
    GetOneProfileService,
    UpdateProfileService,
    UserRepository,
    PersonalDataRepository,
    ProfilesQueryRepository,
    UserPreferencesRepository,
    ProfileWriteRepository,
  ],
  exports: [
    CreateProfileService,
    GetAllProfilesService,
    GetOneProfileService,
    UpdateProfileService,
    PersonalDataRepository,
    UserPreferencesRepository,
  ],
})
export class ProfileModule {}
