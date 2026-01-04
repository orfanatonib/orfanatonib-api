import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UpdateInformativeDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'O título é obrigatório.' })
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'A descrição é obrigatória.' })
    description?: string;

    @IsOptional()
    @IsBoolean()
    public?: boolean;
}
