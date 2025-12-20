import { IsOptional, IsString } from 'class-validator';

export class UpdateCommentDto {
  @IsString({ message: 'name deve ser uma string' })
  name: string;

  @IsString({ message: 'comment deve ser uma string' })
  comment: string;

  @IsString({ message: 'shelter deve ser uma string' })
  shelter: string;

  @IsString({ message: 'neighborhood deve ser uma string' })
  neighborhood: string;

  @IsOptional()
  @IsString({ message: 'published deve ser uma boolean' })
  published?: boolean;
}
