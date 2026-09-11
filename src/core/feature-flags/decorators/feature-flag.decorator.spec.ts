import { FEATURE_FLAG_KEY, FeatureFlag } from "./feature-flag.decorator";

describe("FeatureFlag", () => {
  it("marca o handler com a chave que o guard vai ler", () => {
    const handler = (): void => undefined;
    FeatureFlag("shelter-pagelas")({}, "handler", { value: handler });

    const metadata = Reflect.getMetadata(FEATURE_FLAG_KEY, handler) as string;

    expect(metadata).toBe("shelter-pagelas");
  });

  it("um handler sem o decorador não carrega chave nenhuma", () => {
    const handler = (): void => undefined;

    expect(Reflect.getMetadata(FEATURE_FLAG_KEY, handler)).toBeUndefined();
  });
});
