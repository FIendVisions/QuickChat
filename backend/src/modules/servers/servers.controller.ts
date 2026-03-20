import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { JoinServerDto } from './dto/join-server.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('servers')
@ApiBearerAuth()
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @ApiOperation({ summary: '创建服务器' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateServerDto) {
    return this.serversService.create(dto.userId, dto);
  }

  @ApiOperation({ summary: '通过邀请码加入服务器' })
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinByInvite(@Body() dto: JoinServerDto) {
    return this.serversService.join(dto.userId, dto);
  }

  @ApiOperation({ summary: '我加入的服务器列表（需传 userId）' })
  @Get()
  async list(@Query('userId') userId?: string) {
    if (!userId) return { servers: [] };
    const servers = await this.serversService.listForUser(userId);
    return { servers };
  }

  @ApiOperation({ summary: '频道分组列表' })
  @Get(':id/categories')
  async listCategories(@Param('id') serverId: string, @Query('userId') userId?: string) {
    if (!userId) return { categories: [] };
    const categories = await this.serversService.listCategories(serverId, userId);
    return { categories };
  }

  @ApiOperation({ summary: '创建频道分组（仅群主）' })
  @Post(':id/categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Param('id') serverId: string, @Body() dto: CreateCategoryDto) {
    return this.serversService.createCategory(serverId, dto.userId, dto.name);
  }

  @ApiOperation({ summary: '重命名频道分组（仅群主）' })
  @Patch(':id/categories/:categoryId')
  async updateCategory(
    @Param('id') serverId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.serversService.updateCategory(serverId, categoryId, dto.userId, dto.name);
  }

  @ApiOperation({ summary: '删除频道分组（仅群主，频道变为未分组）' })
  @Delete(':id/categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @Param('id') serverId: string,
    @Param('categoryId') categoryId: string,
    @Query('userId') userId?: string,
  ) {
    if (!userId) throw new BadRequestException('userId is required');
    await this.serversService.deleteCategory(serverId, categoryId, userId);
  }

  @ApiOperation({ summary: '服务器详情（需成员身份，query userId）' })
  @Get(':id')
  async getOne(@Param('id') serverId: string, @Query('userId') userId?: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.serversService.getOne(serverId, userId);
  }

  @ApiOperation({ summary: '退出服务器' })
  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(@Param('id') serverId: string, @Body() body: { userId: string }) {
    await this.serversService.leave(body.userId, serverId);
  }

  @ApiOperation({ summary: '删除服务器（仅群主）' })
  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') serverId: string, @Body() body: { userId: string }) {
    await this.serversService.remove(body.userId, serverId);
  }
}
