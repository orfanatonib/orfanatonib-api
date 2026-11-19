import { BadRequestException } from "@nestjs/common";

import { ArchiveContentPackageService } from "./archive-content-package.service";
import { GetContentStudioDashboardService } from "./get-content-studio-dashboard.service";
import { ResolveReviewCommentService } from "./resolve-review-comment.service";

describe("ArchiveContentPackageService", () => {
  it("delega o arquivamento ao repositório e devolve o pacote", async () => {
    const packages = {
      archivePackage: jest.fn().mockResolvedValue({ id: "p1" }),
    };
    const svc = new ArchiveContentPackageService(packages as never);
    await expect(svc.execute("p1")).resolves.toEqual({ id: "p1" });
    expect(packages.archivePackage).toHaveBeenCalledWith("p1");
  });

  it("propaga o erro do repositório (pacote inexistente ou transição inválida)", async () => {
    const packages = {
      archivePackage: jest
        .fn()
        .mockRejectedValue(new Error("transição inválida")),
    };
    await expect(
      new ArchiveContentPackageService(packages as never).execute("p1"),
    ).rejects.toThrow("transição inválida");
  });
});

describe("ResolveReviewCommentService", () => {
  it("passa pacote, comentário e quem resolveu ao repositório", async () => {
    const packages = {
      resolveReviewComment: jest.fn().mockResolvedValue({ id: "p1" }),
    };
    const svc = new ResolveReviewCommentService(packages as never);
    await expect(svc.execute("p1", "c1", "u1")).resolves.toEqual({ id: "p1" });
    expect(packages.resolveReviewComment).toHaveBeenCalledWith(
      "p1",
      "c1",
      "u1",
    );
  });

  it("propaga o erro do repositório", async () => {
    const packages = {
      resolveReviewComment: jest
        .fn()
        .mockRejectedValue(new Error("comentário inexistente")),
    };
    await expect(
      new ResolveReviewCommentService(packages as never).execute("p", "c", "u"),
    ).rejects.toThrow("inexistente");
  });
});

describe("GetContentStudioDashboardService", () => {
  const data = { packages: {}, stages: {}, jobs: { total: 1 }, recent: [] };
  const setup = () => {
    const dashboard = { getDashboard: jest.fn().mockResolvedValue(data) };
    return {
      dashboard,
      svc: new GetContentStudioDashboardService(dashboard as never),
    };
  };

  it("período invertido: 400 sem consultar o repositório", async () => {
    const { svc, dashboard } = setup();
    await expect(
      svc.execute({ startDate: "2026-12-10", endDate: "2026-12-01" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dashboard.getDashboard).not.toHaveBeenCalled();
  });

  it("período válido, mesmo dia ou aberto: consulta e devolve o DTO", async () => {
    const { svc, dashboard } = setup();
    await svc.execute({
      startDate: "2026-12-01",
      endDate: "2026-12-01",
    } as never);
    await svc.execute({ startDate: "2026-12-01" } as never);
    await svc.execute();
    expect(dashboard.getDashboard).toHaveBeenCalledTimes(3);
  });
});
