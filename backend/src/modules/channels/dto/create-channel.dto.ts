// backend/src/modules/channels/dto/create-channel.dto.ts

import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '../../../common/types';

/**
 * 创建频道 DTO
 *
 * 验证规则：
 * - 名称：2-50 字符
 * - 类型：PUBLIC 或 PRIVATE
 * - 最大人数：仅私有频道，2-50 人
 * - 密码：仅私有频道，可选
 */
export class CreateChannelDto {
  @ApiProperty({
    description: '频道名称',
    example: '游戏大厅',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50, { message: '频道名称长度必须在 2-50 字符之间' })
  name: string;

  @ApiProperty({
    description: '频道类型',
    enum: ChannelType,
    example: ChannelType.PUBLIC,
  })
  @IsEnum(ChannelType, { message: '频道类型必须是 PUBLIC 或 PRIVATE' })
  type: ChannelType;

  @ApiPropertyOptional({
    description: '频道描述',
    example: '欢迎来到游戏大厅！',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: '频道描述不能超过 500 字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '最大参与人数（仅私有频道有效）',
    example: 10,
    minimum: 2,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber({}, { message: '最大人数必须是数字' })
  @Min(2, { message: '最大人数不能少于 2 人' })
  @Max(50, { message: '最大人数不能超过 50 人' })
  maxParticipants?: number;

  @ApiPropertyOptional({
    description: '频道密码（仅私有频道有效）',
    example: 'password123',
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: '密码不能超过 100 字符' })
  password?: string;
}
