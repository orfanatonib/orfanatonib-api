import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateCommentDto {
  @IsString({ message: "name deve ser uma string" })
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString({ message: "comment deve ser uma string" })
  @IsNotEmpty()
  @MaxLength(2000)
  comment: string;

  @IsString({ message: "shelter deve ser uma string" })
  @IsNotEmpty()
  @MaxLength(100)
  shelter: string;

  @IsString({ message: "neighborhood deve ser uma string" })
  @IsNotEmpty()
  @MaxLength(100)
  neighborhood: string;

  @IsOptional()
  @IsBoolean({ message: "published deve ser uma boolean" })
  published?: boolean;
}
