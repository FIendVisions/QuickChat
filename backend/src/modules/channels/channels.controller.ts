// backend/src/modules/channels/channels.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, type File as MulterFile } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
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
import { AddChannelPinDto } from './dto/add-channel-pin.dto';

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
   * 全员置顶列表
   * GET /channels/:id/pins
   */
  @ApiOperation({ summary: '获取频道全员置顶（所有成员可见）' })
  @Get(':id/pins')
  async getChannelPins(@Param('id') channelId: string) {
    return { pins: await this.channelsService.getChannelPins(channelId) };
  }

  /**
   * 添加全员置顶
   * POST /channels/:id/pins
   */
  @ApiOperation({ summary: '全员置顶一条消息（频道成员均可，任意成员可取消）' })
  @Post(':id/pins')
  @HttpCode(HttpStatus.CREATED)
  async addChannelPin(@Param('id') channelId: string, @Body() dto: AddChannelPinDto) {
    const pins = await this.channelsService.addChannelPin(channelId, dto.userId, dto.messageId);
    return { pins };
  }

  /**
   * 取消全员置顶
   * POST /channels/:id/pins/remove
   */
  @ApiOperation({ summary: '取消全员置顶（任意频道成员）' })
  @Post(':id/pins/remove')
  @HttpCode(HttpStatus.OK)
  async removeChannelPin(
    @Param('id') channelId: string,
    @Body() body: { userId: string; messageId: string },
  ) {
    const pins = await this.channelsService.removeChannelPin(channelId, body.userId, body.messageId);
    return { pins };
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
    @Body() createChannelDto: CreateChannelDto,
  ) {
    return this.channelsService.create(createChannelDto.userId, createChannelDto);
  }

  /**
   * 更新频道
   * PATCH /channels/:id
   * 只有频道所有者可以更新
   */
  @ApiOperation({ summary: '更新频道（需在 body 中传 userId）' })
  @Patch(':id')
  async update(
    @Param('id') channelId: string,
    @Body() updateChannelDto: UpdateChannelDto & { userId: string },
  ) {
    return this.channelsService.update(updateChannelDto.userId, channelId, updateChannelDto);
  }

  /**
   * 删除频道
   * DELETE /channels/:id
   */
  @ApiOperation({ summary: '删除频道（需在 body 中传 userId）' })
  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') channelId: string,
    @Body() body: { userId: string },
  ) {
    return this.channelsService.remove(body.userId, channelId);
  }

  /**
   * 加入频道
   * POST /channels/:id/join
   */
  @ApiOperation({ summary: '加入频道' })
  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  async join(
    @Param('id') channelId: string,
    @Body() joinChannelDto: JoinChannelDto,
  ) {
    const userId = joinChannelDto.userId || 'anonymous';
    return this.channelsService.join(userId, channelId, joinChannelDto);
  }

  /**
   * 退出频道
   * POST /channels/:id/leave
   */
  @ApiOperation({ summary: '退出频道' })
  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @Param('id') channelId: string,
    @Body() body: { userId?: string },
  ) {
    const userId = body?.userId || 'anonymous';
    return this.channelsService.leave(userId, channelId);
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
   * 上传附件（图片/文档等），返回相对路径供发送消息时使用
   * POST /channels/:id/upload  multipart field: file
   */
  @ApiOperation({ summary: '上传频道附件' })
  @Post(':id/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = file.originalname.includes('.')
            ? file.originalname.slice(file.originalname.lastIndexOf('.')).slice(0, 24)
            : '';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const m = file.mimetype || '';
        const allowedDoc =
          m === 'application/pdf' ||
          m === 'text/plain' ||
          m === 'application/msword' ||
          m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          m === 'application/vnd.ms-excel' ||
          m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          m === 'application/zip' ||
          m === 'application/x-zip-compressed';
        if (m.startsWith('image/') || allowedDoc) cb(null, true);
        else cb(null, false);
      },
    }),
  )
  async uploadAttachment(
    @Param('id') channelId: string,
    @UploadedFile() file?: MulterFile,
  ) {
    if (!file?.filename) {
      throw new BadRequestException('请选择支持的文件（图片或常见文档）');
    }
    await this.channelsService.findOne(channelId);
    return {
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
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
