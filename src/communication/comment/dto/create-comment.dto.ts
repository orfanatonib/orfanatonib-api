import { IsNotEmpty, MaxLength, IsString } from "class-validator";

export class CreateCommentDto {
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
}
