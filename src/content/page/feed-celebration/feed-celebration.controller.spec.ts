import { GUARDS_METADATA } from "@nestjs/common/constants";
import { FEATURE_FLAG_KEY } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { UnauthenticatedException } from "src/common/exceptions";
import { FeedCelebrationController } from "./feed-celebration.controller";

const handler = (name: "getState" | "toggle"): object =>
  Reflect.get(FeedCelebrationController.prototype, name) as object;
const guards = (name: "getState" | "toggle"): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, handler(name)) as unknown[]) ?? [];

describe("FeedCelebrationController", () => {
  it("toggle exige sessão e flag própria + flag do feed", () => {
    expect(guards("toggle")).toEqual([JwtAuthGuard, FeatureFlagGuard]);
    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, handler("toggle"))).toEqual([
      "shelter_feed",
      "shelter_feed_celebrations",
    ]);
  });

  it("leitura é aberta a visitante (sem JwtAuthGuard) mas atrás das flags", () => {
    expect(guards("getState")).toEqual([FeatureFlagGuard]);
    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, handler("getState"))).toEqual([
      "shelter_feed",
      "shelter_feed_celebrations",
    ]);
  });

  it("toggle sem userId no token é 401", async () => {
    const controller = new FeedCelebrationController(
      {} as never,
      { toggle: jest.fn() } as never,
      {} as never,
    );
    await expect(
      controller.toggle("7b3f2f0e-6a3e-4b1a-8d2f-0a1b2c3d4e5f", {} as never),
    ).rejects.toBeInstanceOf(UnauthenticatedException);
  });
});
