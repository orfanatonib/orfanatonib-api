import { GUARDS_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { MediaReconciliationController } from "./media-reconciliation.controller";
import { ReconcileMediaQueryDto } from "./media-reconciliation.dto";

describe("MediaReconciliationController", () => {
  it("[media-upload.reconcile.post#perfil-admin] só admin", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      MediaReconciliationController,
    ) as unknown[];
    expect(guards).toEqual(
      expect.arrayContaining([JwtAuthGuard, AdminRoleGuard]),
    );
  });

  it("[media-upload.reconcile.post#dry-run-padrao] dry-run é o padrão; dryRun=false e minAgeHours são repassados", async () => {
    const service = { reconcile: jest.fn().mockResolvedValue({}) };
    const controller = new MediaReconciliationController(service as never);
    await controller.reconcile({});
    expect(service.reconcile).toHaveBeenLastCalledWith({
      dryRun: true,
      minAgeHours: undefined,
    });
    await controller.reconcile({ dryRun: false, minAgeHours: 0 });
    expect(service.reconcile).toHaveBeenLastCalledWith({
      dryRun: false,
      minAgeHours: 0,
    });
  });

  it("[media-upload.reconcile.post#validacao] DTO converte texto de query e recusa valores inválidos", async () => {
    const ok = plainToInstance(ReconcileMediaQueryDto, {
      dryRun: "false",
      minAgeHours: "2",
    });
    expect(ok.dryRun).toBe(false);
    expect(ok.minAgeHours).toBe(2);
    expect(await validate(ok)).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ReconcileMediaQueryDto, { minAgeHours: "-1" }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ReconcileMediaQueryDto, { dryRun: "talvez" }),
      ),
    ).not.toHaveLength(0);
  });
});
