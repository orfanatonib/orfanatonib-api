import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ResolveReviewCommentDto {
  /** Recado da produção para o revisor ao devolver o item. */
  @IsString()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
