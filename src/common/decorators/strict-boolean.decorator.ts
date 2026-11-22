import { Transform } from "class-transformer";

/**
 * Mantém o valor cru do corpo: com `enableImplicitConversion` o pipe global transformaria qualquer
 * texto não vazio em `true` (`"false"` e `"talvez"` virariam `true`) antes do `@IsBoolean` olhar.
 */
export const StrictBoolean = (): PropertyDecorator =>
  Transform(
    ({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key],
  );
