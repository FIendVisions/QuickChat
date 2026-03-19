// backend/src/modules/channels/dto/update-channel.dto.ts

import { IsString, IsOptional, IsNumber, IsEnum, Min, Max, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '../../../common/types';

/**
 * 更新频道 DTO
 * 所有字段都是可选的
 */
export class UpdateChannelDto {
  @ApiPropertyOptional({
    description: '频道名称',
    example: '新的频道名称',
  })
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: '频道名称长度必须在 2-50 字符之间' })
  name?: string;

  @ApiPropertyOptional({ description: '频道类型', enum: ChannelType })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;

  @ApiPropertyOptional({
    description: '频道描述',
    example: '更新后的描述',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: '频道描述不能超过 500 字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '最大参与人数',
    example: 20,
  })
  @IsOptional()
  @IsNumber({}, { message: '最大人数必须是数字' })
  @Min(2, { message: '最大人数不能少于 2 人' })
  @Max(50, { message: '最大人数不能超过 50 人' })
  maxParticipants?: number;

  @ApiPropertyOptional({
    description: '频道密码',
    example: 'newpassword',
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: '密码不能超过 100 字符' })
  password?: string;
}
