import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from './user.entity';
import { ShelterEntity } from 'src/modules/shelters/entities/shelter.entity/shelter.entity';
import { MediaItemEntity } from 'src/share/media/media-item/media-item.entity';

import { UserRepository } from './user.repository';
import { CreateUserService } from './services/create-user.service';
import { GetUsersService } from './services/get-user.service';
import { UserController } from './user.controller';

import { TeacherProfilesModule } from 'src/modules/teacher-profiles/teacher-profiles.module';
import { LeaderProfilesModule } from 'src/modules/leader-profiles/leader-profiles.module';
import { MediaModule } from 'src/share/media/media.module';
import { AuthModule } from 'src/auth/auth.module';
import { UpdateUserService } from './services/update-user.service';
import { DeleteUserService } from './services/delete-user.service';
import { UpdateUserImageService } from './services/update-user-image.service';
import { UpdateOwnProfileService } from './services/update-own-profile.service';
import { ChangePasswordService } from './services/change-password.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, ShelterEntity, MediaItemEntity]),
    TeacherProfilesModule,
    LeaderProfilesModule,
    MediaModule,
    AuthModule,
  ],
  providers: [
    UserRepository,
    CreateUserService,
    GetUsersService,
    UpdateUserService,
    DeleteUserService,
    UpdateUserImageService,
    UpdateOwnProfileService,
    ChangePasswordService,
  ],
  controllers: [UserController, ProfileController],
  exports: [
    UserRepository,
    CreateUserService,
    GetUsersService,
    UpdateUserService,
    DeleteUserService,
    TypeOrmModule,
  ],
})
export class UserModule {}
