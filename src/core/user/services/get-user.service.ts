import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { GetUsersQueryDto } from '../dto/get-users-query.dto';
import { UserRepository } from '../user.repository';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';

@Injectable()
export class GetUsersService {
  private readonly logger = new Logger(GetUsersService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async findAllPaginated(q: GetUsersQueryDto) {
    return this.userRepo.findAllPaginated(q);
  }

  async findAlll(): Promise<UserEntity[]> {
    return this.userRepo.findAll();
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('UserEntity not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findByEmail(email);
  }

  async findOneForProfile(id: string) {
    const user = await this.userRepo.findByIdWithProfiles(id);
    if (!user) {
      throw new NotFoundException('UserEntity not found');
    }

    const imageMedia = await this.mediaItemProcessor.findMediaItemByTarget(
      id,
      'UserEntity',
    );

    return this.buildProfileResponse(user, imageMedia || undefined);
  }

  private buildProfileResponse(user: UserEntity, imageMedia?: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      active: user.active,
      completed: user.completed,
      commonUser: user.commonUser,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
      image: imageMedia
        ? {
            id: imageMedia.id,
            title: imageMedia.title,
            description: imageMedia.description,
            url: imageMedia.url,
            uploadType: imageMedia.uploadType,
            mediaType: imageMedia.mediaType,
            isLocalFile: imageMedia.isLocalFile,
            platformType: imageMedia.platformType,
            originalName: imageMedia.originalName,
            size: imageMedia.size,
            createdAt: imageMedia.createdAt,
            updatedAt: imageMedia.updatedAt,
          }
        : null,
      memberProfile: user.memberProfile
        ? {
            id: user.memberProfile.id,
            active: user.memberProfile.active,
            createdAt: user.memberProfile.createdAt,
            updatedAt: user.memberProfile.updatedAt,
            team: user.memberProfile.team
              ? {
                  id: user.memberProfile.team.id,
                  numberTeam: user.memberProfile.team.numberTeam,
                  description: user.memberProfile.team.description,
                  createdAt: user.memberProfile.team.createdAt,
                  updatedAt: user.memberProfile.team.updatedAt,
                  shelter: user.memberProfile.team.shelter
                    ? {
                        id: user.memberProfile.team.shelter.id,
                        name: user.memberProfile.team.shelter.name,
                        description: user.memberProfile.team.shelter.description,
                        teamsQuantity: user.memberProfile.team.shelter.teamsQuantity,
                        createdAt: user.memberProfile.team.shelter.createdAt,
                        updatedAt: user.memberProfile.team.shelter.updatedAt,
                        address: user.memberProfile.team.shelter.address
                          ? {
                              id: user.memberProfile.team.shelter.address.id,
                              street: user.memberProfile.team.shelter.address.street,
                              number: user.memberProfile.team.shelter.address.number,
                              district:
                                user.memberProfile.team.shelter.address.district,
                              city: user.memberProfile.team.shelter.address.city,
                              state: user.memberProfile.team.shelter.address.state,
                              postalCode:
                                user.memberProfile.team.shelter.address.postalCode,
                              createdAt:
                                user.memberProfile.team.shelter.address.createdAt,
                              updatedAt:
                                user.memberProfile.team.shelter.address.updatedAt,
                            }
                          : null,
                      }
                    : null,
                }
              : null,
          }
        : null,
      leaderProfile: user.leaderProfile
        ? {
            id: user.leaderProfile.id,
            active: user.leaderProfile.active,
            createdAt: user.leaderProfile.createdAt,
            updatedAt: user.leaderProfile.updatedAt,
            teams:
              user.leaderProfile.teams && user.leaderProfile.teams.length > 0
                ? user.leaderProfile.teams.map((team) => ({
                    id: team.id,
                    numberTeam: team.numberTeam,
                    description: team.description,
                    createdAt: team.createdAt,
                    updatedAt: team.updatedAt,
                    shelter: team.shelter
                      ? {
                          id: team.shelter.id,
                          name: team.shelter.name,
                          description: team.shelter.description,
                          teamsQuantity: team.shelter.teamsQuantity,
                          createdAt: team.shelter.createdAt,
                          updatedAt: team.shelter.updatedAt,
                          address: team.shelter.address
                            ? {
                                id: team.shelter.address.id,
                                street: team.shelter.address.street,
                                number: team.shelter.address.number,
                                district: team.shelter.address.district,
                                city: team.shelter.address.city,
                                state: team.shelter.address.state,
                                postalCode: team.shelter.address.postalCode,
                                createdAt: team.shelter.address.createdAt,
                                updatedAt: team.shelter.address.updatedAt,
                              }
                            : null,
                        }
                      : null,
                  }))
                : [],
          }
        : null,
    };
  }
}
