// backend/src/modules/channels/dto/query-channel.dto.ts

import { IsOptional, IsEnum, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '../../../common/types';
import { Type } from 'class-transformer';

/**
 * 查询频道 DTO
 * 用于频道列表的筛选和分页
 */
export class QueryChannelDto {
  @ApiPropertyOptional({
    description: '按频道类型筛选',
    enum: ChannelType,
  })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 20;
}
