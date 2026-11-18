import { ResourceNotFoundException } from "src/common/exceptions";
import { CancelStageGenerationService } from "./cancel-stage-generation.service";

describe("CancelStageGenerationService", () => {
  it("devolve o job cancelado", async () => {
    const packages = {
      cancelGenerationJob: jest.fn().mockResolvedValue({ id: "j" }),
    };
    expect(
      await new CancelStageGenerationService(packages as never).execute(
        "p",
        "s",
      ),
    ).toEqual({ id: "j" });
  });

  it("sem geração ativa: 404", async () => {
    const packages = { cancelGenerationJob: jest.fn().mockResolvedValue(null) };
    await expect(
      new CancelStageGenerationService(packages as never).execute("p", "s"),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});
