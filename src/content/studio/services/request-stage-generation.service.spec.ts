import { RequestStageGenerationService } from "./request-stage-generation.service";
import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { RequestStageGenerationDto } from "../dto/request-stage-generation.dto";
import { ServiceUnavailableException } from "@nestjs/common";

describe("RequestStageGenerationService", () => {
  const service = new RequestStageGenerationService();

  it("fails closed while no provider worker is registered", async () => {
    const dto: RequestStageGenerationDto = {
      idempotencyKey: "key-123",
      capability: AiGenerationCapability.TEXT_STRUCTURED,
    };

    await expect(service.execute("pkg-1", "stage-1", dto, "user-1"))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
