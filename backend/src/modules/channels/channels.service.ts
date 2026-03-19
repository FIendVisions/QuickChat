// backend/src/modules/channels/channels.service.ts

import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { Channel, ChannelMember, User } from '@prisma/client';
import { ChannelType } from '../../common/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { WebsocketGateway } from '../../gateway/websocket.gateway';
import { SequenceGeneratorService } from '../../message-queue/sequence-generator.service';
import { MessageAckService } from '../../message-queue/message-ack.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { JoinChannelDto } from './dto/join-channel.dto';
import { QueryChannelDto } from './dto/query-channel.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChannelDetail, ChannelListItem, ChannelMemberInfo, JoinChannelResponse } from './interfaces/channel-response.interface';

/**
 * 频道服务
 * 负责频道的业务逻辑处理
 */
@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly sequenceGenerator: SequenceGeneratorService,
    private readonly messageAck: MessageAckService,
  ) {}

  /**
   * 获取频道列表（分页 + 筛选）
   */
  async findAll(query: QueryChannelDto): Promise<{ channels: ChannelListItem[]; total: number }> {
    const { type, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (type) {
      where.type = type;
    }

    // 查询频道和参与人数
    const [channels, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.channel.count({ where }),
    ]);

    const channelList: ChannelListItem[] = channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type as ChannelType,
      description: channel.description,
      owner: {
        id: channel.owner.id,
        username: channel.owner.username,
      },
      maxParticipants: channel.maxParticipants,
      participantCount: channel._count.members,
      hasPassword: !!channel.password,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    }));

    this.logger.log(`Found ${total} channels`);
    return { channels: channelList, total };
  }

  /**
   * 获取频道详情
   */
  async findOne(id: string): Promise<ChannelDetail> {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return {
      ...channel,
      participantCount: channel._count.members,
    };
  }

  /**
   * 创建频道
   */
  async create(userId: string, dto: CreateChannelDto): Promise<ChannelDetail> {
    // 验证私有频道的特有字段
    if (dto.type === ChannelType.PRIVATE) {
      // 私有频道必须有最大人数限制
      if (!dto.maxParticipants) {
        dto.maxParticipants = 10; // 默认 10 人
      }

      // 如果设置了密码，进行加密
      let hashedPassword: string | undefined;
      if (dto.password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(dto.password, salt);
      }

      // 创建私有频道
      const channel = await this.prisma.channel.create({
        data: {
          name: dto.name,
          type: dto.type,
          ownerId: userId,
          description: dto.description,
          maxParticipants: dto.maxParticipants,
          password: hashedPassword,
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      // 创建者自动加入频道
      await this.addMember(channel.id, userId);

      this.logger.log(`Created private channel: ${channel.id} by user ${userId}`);

      // 广播频道创建事件
      this.websocketGateway.broadcast('channel:created', {
        ...channel,
        participantCount: 1,
      });

      return {
        ...channel,
        participantCount: 1,
      };
    }

    // 创建公共频道（无密码，无人数限制）
    const channel = await this.prisma.channel.create({
      data: {
        name: dto.name,
        type: dto.type,
        ownerId: userId,
        description: dto.description,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    // 创建者自动加入频道
    await this.addMember(channel.id, userId);

    this.logger.log(`Created public channel: ${channel.id} by user ${userId}`);

    // 广播频道创建事件
    this.websocketGateway.broadcast('channel:created', {
      ...channel,
      participantCount: 1,
    });

    return {
      ...channel,
      participantCount: 1,
    };
  }

  /**
   * 更新频道
   */
  async update(userId: string, channelId: string, dto: UpdateChannelDto): Promise<ChannelDetail> {
    // 验证频道所有权
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { ownerId: true, type: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.ownerId !== userId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    // 准备更新数据
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.maxParticipants !== undefined) {
      // 公共频道不能设置人数限制
      if (channel.type === ChannelType.PUBLIC) {
        throw new ForbiddenException('Public channels cannot have participant limits');
      }
      updateData.maxParticipants = dto.maxParticipants;
    }
    if (dto.password !== undefined) {
      // 公共频道不能设置密码
      if (channel.type === ChannelType.PUBLIC) {
        throw new ForbiddenException('Public channels cannot have passwords');
      }
      // 加密新密码
      if (dto.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(dto.password, salt);
      } else {
        updateData.password = null;
      }
    }

    // 更新频道
    const updatedChannel = await this.prisma.channel.update({
      where: { id: channelId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    this.logger.log(`Updated channel: ${channelId} by user ${userId}`);
    return {
      ...updatedChannel,
      participantCount: updatedChannel._count.members,
    };
  }

  /**
   * 删除频道
   */
  async remove(userId: string, channelId: string): Promise<void> {
    // 验证频道所有权
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { ownerId: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.ownerId !== userId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    // 删除频道（级联删除成员和消息）
    await this.prisma.channel.delete({
      where: { id: channelId },
    });

    this.logger.log(`Deleted channel: ${channelId} by user ${userId}`);
  }

  /**
   * 加入频道
   */
  async join(userId: string, channelId: string, dto: JoinChannelDto): Promise<JoinChannelResponse> {
    // 查询频道
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // 检查是否已在频道中
    const existingMember = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already in this channel');
    }

    // 私有频道验证
    if (channel.type === ChannelType.PRIVATE) {
      // 验证密码
      if (channel.password) {
        if (!dto.password) {
          throw new ForbiddenException('This channel requires a password');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, channel.password);
        if (!isPasswordValid) {
          throw new ForbiddenException('Invalid password');
        }
      }

      // 验证人数限制
      if (channel.maxParticipants && channel._count.members >= channel.maxParticipants) {
        throw new ForbiddenException('Channel is full');
      }
    }

    // 添加成员
    await this.addMember(channelId, userId);

    this.logger.log(`User ${userId} joined channel ${channelId}`);

    // 广播成员加入事件
    this.websocketGateway.sendToChannel(channelId, 'member:joined', {
      channelId: channel.id,
      channelName: channel.name,
      userId: userId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      channelId: channel.id,
      channelName: channel.name,
      isPrivate: channel.type === ChannelType.PRIVATE,
      canSpeak: channel.type === ChannelType.PRIVATE, // 私有频道可以语音
      participantCount: channel._count.members + 1,
    };
  }

  /**
   * 退出频道
   */
  async leave(userId: string, channelId: string): Promise<void> {
    // 验证成员身份
    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not in this channel');
    }

    // 删除成员
    await this.prisma.channelMember.delete({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    // 如果频道没有成员了，删除频道（可选）
    const remainingCount = await this.prisma.channelMember.count({
      where: { channelId },
    });

    if (remainingCount === 0) {
      await this.prisma.channel.delete({
        where: { id: channelId },
      });
      this.logger.log(`Deleted empty channel: ${channelId}`);
    }

    this.logger.log(`User ${userId} left channel ${channelId}`);
  }

  /**
   * 获取频道成员列表
   */
  async getMembers(channelId: string): Promise<ChannelMemberInfo[]> {
    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return members.map((member) => ({
      userId: member.user.id,
      username: member.user.username,
      avatar: member.user.avatar,
      joinedAt: member.joinedAt,
      isOnline: member.user.status !== 'OFFLINE',
    }));
  }

  /**
   * 获取频道消息历史
   */
  async getMessages(
    channelId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ messages: any[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
    const skip = (page - 1) * pageSize;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { channelId },
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.message.count({ where: { channelId } }),
    ]);

    return {
      messages: messages.reverse(), // 按时间正序返回
      total,
      page,
      pageSize,
      hasMore: skip + messages.length < total,
    };
  }

  /**
   * 添加频道成员（内部方法）
   */
  private async addMember(channelId: string, userId: string): Promise<ChannelMember> {
    return this.prisma.channelMember.create({
      data: {
        channelId,
        userId,
      },
    });
  }

  /**
   * 检查用户是否在频道中
   */
  async isUserInChannel(channelId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    return !!member;
  }

  /**
   * 发送消息到频道
   */
  async sendMessage(channelId: string, dto: SendMessageDto): Promise<any> {
    // 验证频道存在
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // 验证用户是否在频道中
    let isMember = await this.isUserInChannel(channelId, dto.userId);

    // 如果用户不在频道中，自动加入
    if (!isMember) {
      this.logger.log(`User ${dto.userId} not in channel ${channelId}, auto-joining...`);

      try {
        await this.addMember(channelId, dto.userId);
      } catch (error) {
        // 如果用户不存在（外键约束），使用默认admin用户
        this.logger.warn(`User ${dto.userId} does not exist, using default admin user`);
        dto.userId = '5b3b3e13-e544-40a9-ae37-ce7045d598af'; // admin用户ID
        dto.username = 'admin';

        // 再次尝试添加成员
        const checkAgain = await this.isUserInChannel(channelId, dto.userId);
        if (!checkAgain) {
          await this.addMember(channelId, dto.userId);
        }
      }

      // 广播成员加入事件
      this.websocketGateway.sendToChannel(channelId, 'member:joined', {
        channelId: channel.id,
        channelName: channel.name,
        userId: dto.userId,
        timestamp: new Date().toISOString(),
      });
    }

    // 生成序列号
    const sequence = await this.sequenceGenerator.getNextSequence(channelId);

    // 创建消息
    const message = await this.prisma.message.create({
      data: {
        channelId,
        userId: dto.userId,
        content: dto.content,
        type: dto.type || 'TEXT',
        sequence,
        status: 'SENT',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`📨 [MESSAGE] Message ${message.id} created (seq: ${sequence}) in channel ${channelId} by user ${dto.userId}`);

    // 通过 WebSocket 广播消息到频道内所有用户
    const broadcastData = {
      id: message.id,
      channelId: message.channelId,
      userId: message.userId,
      username: message.user.username,
      avatar: message.user.avatar,
      content: message.content,
      type: message.type,
      sequence: message.sequence,
      status: message.status,
      createdAt: message.createdAt,
    };

    // 标记消息为待确认
    this.messageAck.markPending(channelId, message.id);

    // 广播到频道（所有用户，包括发送者）
    const recipientCount = this.websocketGateway.sendToChannel(channelId, 'message:new', broadcastData);
    this.logger.log(`📡 [BROADCAST] Message ${message.id} (seq: ${sequence}) sent to ${recipientCount} recipient(s)`);

    return message;
  }
}
