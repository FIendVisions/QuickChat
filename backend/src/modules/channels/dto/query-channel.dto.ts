// backend/src/modules/channels/dto/query-channel.dto.ts

import { IsOptional, IsEnum, IsInt, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '../../../common/types';
import { Type } from 'class-transformer';

export class QueryChannelDto {
  @ApiPropertyOptional({ description: '按频道类型筛选', enum: ChannelType })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;

  @ApiPropertyOptional({ description: '用户ID（用于筛选私密频道）' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ description: '仅返回用户已加入的频道', default: false })
  @IsOptional()
  @IsString()
  myOnly?: string;

  @ApiPropertyOptional({ description: '每页数量', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 50;

  @ApiPropertyOptional({ description: '按服务器筛选频道（需配合 userId 校验成员）' })
  @IsOptional()
  @IsString()
  serverId?: string;
}
