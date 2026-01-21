import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEntity } from './contact.entity';
import { ContactRepository } from './contact.repository';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../../core/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactEntity]),
    NotificationModule,
    UserModule,
  ],
  controllers: [ContactController],
  providers: [
    ContactService,
    ContactRepository,
  ],
})
export class ContactModule { }
