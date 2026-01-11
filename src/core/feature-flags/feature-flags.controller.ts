import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/role-guard';

@Controller('feature-flags')
export class FeatureFlagsController {
    constructor(private readonly service: FeatureFlagsService) { }

    @UseGuards(JwtAuthGuard, AdminRoleGuard)
    @Post()
    create(@Body() dto: CreateFeatureFlagDto) {
        return this.service.create(dto);
    }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('check/:key')
    async check(@Param('key') key: string, @Query('environment') environment?: string) {
        const enabled = await this.service.isEnabled(key, environment);
        return { key, enabled, environment };
    }

    @UseGuards(JwtAuthGuard)
    @Get('environment/:environment')
    findByEnvironment(@Param('environment') environment: string) {
        return this.service.findByEnvironment(environment);
    }

    @Get(':key')
    findOne(@Param('key') key: string) {
        return this.service.findByKey(key);
    }

    @UseGuards(JwtAuthGuard, AdminRoleGuard)
    @Patch(':key')
    update(@Param('key') key: string, @Body() dto: UpdateFeatureFlagDto) {
        return this.service.update(key, dto);
    }

    @UseGuards(JwtAuthGuard, AdminRoleGuard)
    @Patch(':key/toggle')
    toggle(@Param('key') key: string) {
        return this.service.toggle(key);
    }

    @UseGuards(JwtAuthGuard, AdminRoleGuard)
    @Delete(':key')
    async remove(@Param('key') key: string) {
        await this.service.remove(key);
        return { message: `Feature flag "${key}" deleted successfully` };
    }
}
