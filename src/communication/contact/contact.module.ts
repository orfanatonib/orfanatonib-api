import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContactEntity } from "./contact.entity";
import { ContactRepository } from "./contact.repository";
import { CreateContactService } from "./services/create-contact.service";
import { GetContactService } from "./services/get-contact.service";
import { UpdateContactService } from "./services/update-contact.service";
import { DeleteContactService } from "./services/delete-contact.service";
import { ContactController } from "./contact.controller";
import { NotificationModule } from "../notification/notification.module";
import { UserModule } from "../../core/user/user.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactEntity]),
    NotificationModule,
    UserModule,
  ],
  controllers: [ContactController],
  providers: [
    ContactRepository,
    CreateContactService,
    GetContactService,
    UpdateContactService,
    DeleteContactService,
  ],
  exports: [
    CreateContactService,
    GetContactService,
    UpdateContactService,
    DeleteContactService,
  ],
})
export class ContactModule {}
