import { Test } from "@nestjs/testing";
import { CreateContactService } from "./create-contact.service";
import { ContactRepository } from "../contact.repository";
import { NotificationService } from "../../notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";

describe("CreateContactService", () => {
  const repository = { saveContact: jest.fn() };
  const notificationService = { sendContactNotification: jest.fn() };
  const getUsersService = { findAdminEmails: jest.fn() };

  let service: CreateContactService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateContactService,
        { provide: ContactRepository, useValue: repository },
        { provide: NotificationService, useValue: notificationService },
        { provide: GetUsersService, useValue: getUsersService },
      ],
    }).compile();

    service = moduleRef.get(CreateContactService);
  });

  it("creates contact and dispatches notification to admins", async () => {
    const contactData = { id: "1", name: "João", email: "joao@test.com", phone: "999", message: "Ola" };
    repository.saveContact.mockResolvedValue(contactData);
    getUsersService.findAdminEmails.mockResolvedValue(["admin@test.com"]);
    notificationService.sendContactNotification.mockResolvedValue(undefined);

    const result = await service.execute(contactData as any);

    expect(result).toEqual(contactData);
    expect(repository.saveContact).toHaveBeenCalledWith(contactData);
  });
});
