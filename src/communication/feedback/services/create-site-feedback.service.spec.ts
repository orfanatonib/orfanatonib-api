import { Test } from "@nestjs/testing";
import { CreateSiteFeedbackService } from "./create-site-feedback.service";
import { SiteFeedbackRepository } from "../repository/site-feedback.repository";
import { NotificationService } from "../../notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";

describe("CreateSiteFeedbackService", () => {
  const repository = { create: jest.fn(), save: jest.fn() };
  const notificationService = { sendFeedbackNotification: jest.fn() };
  const getUsersService = { findAdminEmails: jest.fn() };

  let service: CreateSiteFeedbackService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateSiteFeedbackService,
        { provide: SiteFeedbackRepository, useValue: repository },
        { provide: NotificationService, useValue: notificationService },
        { provide: GetUsersService, useValue: getUsersService },
      ],
    }).compile();

    service = moduleRef.get(CreateSiteFeedbackService);
  });

  it("creates and saves site feedback", async () => {
    const dto = { name: "Pedro", email: "pedro@test.com", rating: 5, comment: "Excelente" };
    const entity = { id: "1", ...dto };

    repository.create.mockReturnValue(entity);
    repository.save.mockResolvedValue(entity);
    getUsersService.findAdminEmails.mockResolvedValue([]);

    const result = await service.execute(dto as any);

    expect(result).toEqual(entity);
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(entity);
  });
});
