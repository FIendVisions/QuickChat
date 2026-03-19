// backend/src/modules/channels/channels.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelOwnerGuard } from '../../common/guards/channel-owner.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { JoinChannelDto } from './dto/join-channel.dto';
import { QueryChannelDto } from './dto/query-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * 频道控制器
 * 提供频道管理的 REST API
 */
@ApiTags('channels')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // 临时禁用 JWT 守卫以进行测试
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  /**
   * 获取频道列表
   * GET /channels
   */
  @ApiOperation({ summary: '获取频道列表', description: '支持按类型筛选和分页' })
  @Get()
  async findAll(@Query() query: QueryChannelDto) {
    return this.channelsService.findAll(query);
  }

  /**
   * 获取频道详情
   * GET /channels/:id
   */
  @ApiOperation({ summary: '获取频道详情' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  /**
   * 创建频道
   * POST /channels
   */
  @ApiOperation({ summary: '创建频道' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: User,
    @Body() createChannelDto: CreateChannelDto,
  ) {
    return this.channelsService.create(user.id, createChannelDto);
  }

  /**
   * 更新频道
   * PATCH /channels/:id
   * 只有频道所有者可以更新
   */
  @ApiOperation({ summary: '更新频道', description: '只有频道所有者可以更新' })
  @Patch(':id')
  @UseGuards(ChannelOwnerGuard)
  async update(
    @CurrentUser() user: User,
    @Param('id') channelId: string,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    return this.channelsService.update(user.id, channelId, updateChannelDto);
  }

  /**
   * 删除频道
   * DELETE /channels/:id
   * 只有频道所有者可以删除
   */
  @ApiOperation({ summary: '删除频道', description: '只有频道所有者可以删除' })
  @Delete(':id')
  @UseGuards(ChannelOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id') channelId: string,
  ) {
    return this.channelsService.remove(user.id, channelId);
  }

  /**
   * 加入频道
   * POST /channels/:id/join
   */
  @ApiOperation({ summary: '加入频道' })
  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  async join(
    @CurrentUser() user: User,
    @Param('id') channelId: string,
    @Body() joinChannelDto: JoinChannelDto,
  ) {
    return this.channelsService.join(user.id, channelId, joinChannelDto);
  }

  /**
   * 退出频道
   * POST /channels/:id/leave
   */
  @ApiOperation({ summary: '退出频道' })
  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @CurrentUser() user: User,
    @Param('id') channelId: string,
  ) {
    return this.channelsService.leave(user.id, channelId);
  }

  /**
   * 获取频道成员列表
   * GET /channels/:id/members
   */
  @ApiOperation({ summary: '获取频道成员列表' })
  @Get(':id/members')
  async getMembers(@Param('id') channelId: string) {
    return this.channelsService.getMembers(channelId);
  }

  /**
   * 获取频道消息历史
   * GET /channels/:id/messages
   */
  @ApiOperation({ summary: '获取频道消息历史' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 50 })
  @Get(':id/messages')
  async getMessages(
    @Param('id') channelId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.channelsService.getMessages(channelId, page, pageSize);
  }

  /**
   * 发送消息到频道
   * POST /channels/:id/messages
   */
  @ApiOperation({ summary: '发送消息到频道' })
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('id') channelId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.channelsService.sendMessage(channelId, sendMessageDto);
  }
}
