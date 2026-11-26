import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { StrictBoolean } from "src/common/decorators/strict-boolean.decorator";
import { ListQueryDto } from "./list-query.dto";

/**
 * Filtros das caixas de entrada do admin (contatos e feedbacks): `read=true|false`
 * (texto estrito: `"talvez"` é 400, não `true`) além dos filtros comuns de lista.
 */
export class ReadFilterQueryDto extends ListQueryDto {
  @IsOptional()
  @StrictBoolean()
  @Transform(({ value }: { value: unknown }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsBoolean({ message: "read deve ser true ou false" })
  read?: boolean;
}
