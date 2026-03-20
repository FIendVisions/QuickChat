import {
  Controller,
  Get,
  Post,
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
