
































































import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
    Logger,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IntegrationService } from './integration.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { IntegrationResponseDto, PaginatedResponseDto } from './dto/integration-response.dto';
import { QueryIntegrationDto } from './dto/query-integration.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { AdminOrLeaderRoleGuard } from 'src/core/auth/guards/role-guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard, AdminOrLeaderRoleGuard)
export class IntegrationController {
    private readonly logger = new Logger(IntegrationController.name);

    constructor(private readonly service: IntegrationService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @UploadedFile() file: Express.Multer.File,
        @Body('integrationData') integrationDataRaw?: string,
    ): Promise<IntegrationResponseDto> {
        try {
            if (!integrationDataRaw) {
                throw new BadRequestException('Field "integrationData" is required.');
            }

            const parsed = JSON.parse(integrationDataRaw);
            const dto = plainToInstance(CreateIntegrationDto, parsed);

            const errors = await validate(dto);
            if (errors.length > 0) {
                this.logger.error('Validation errors:', JSON.stringify(errors, null, 2));
                throw new BadRequestException('Invalid data in request');
            }

            this.logger.log(`Creating new integration: ${dto.name}`);
            const result = await this.service.create(dto, file);
            this.logger.log(`Integration created successfully: ${result.id}`);
            return result;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Error creating integration', error);
            throw new BadRequestException('Error creating integration.');
        }
    }

    @Get()
    async findAllPaginated(
        @Query() query: QueryIntegrationDto,
    ): Promise<PaginatedResponseDto<IntegrationResponseDto>> {
        return this.service.findAllPaginated(query);
    }

    @Get('simple')
    async findAll(): Promise<IntegrationResponseDto[]> {
        return this.service.findAll();
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<IntegrationResponseDto> {
        return this.service.findOne(id);
    }

    @Put(':id')
    @UseInterceptors(FileInterceptor('file'))
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('integrationData') integrationDataRaw?: string,
    ): Promise<IntegrationResponseDto> {
        try {
            if (!integrationDataRaw) {
                throw new BadRequestException('Field "integrationData" is required.');
            }

            const parsed = JSON.parse(integrationDataRaw);
            const dto = plainToInstance(UpdateIntegrationDto, parsed);

            const errors = await validate(dto);
            if (errors.length > 0) {
                this.logger.error('Validation errors:', JSON.stringify(errors, null, 2));
                throw new BadRequestException('Invalid data in request');
            }

            this.logger.log(`Updating integration: ${id}`);
            const result = await this.service.update(id, dto, file);
            this.logger.log(`Integration updated successfully: ${id}`);
            return result;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Error updating integration', error);
            throw new BadRequestException('Error updating integration.');
        }
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        this.logger.log(`Deleting integration: ${id}`);
        await this.service.remove(id);
        this.logger.log(`Integration deleted successfully: ${id}`);
    }
}
