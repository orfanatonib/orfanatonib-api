import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEntity } from './entities/attendance.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { ShelterScheduleEntity } from 'src/shelter/schedule/entities/shelter-schedule.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      AttendanceEntity,
      ShelterScheduleEntity,
      TeamEntity,
      UserEntity
    ])
  ],
  providers: [AttendanceService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
