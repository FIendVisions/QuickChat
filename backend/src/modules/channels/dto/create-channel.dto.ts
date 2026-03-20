// backend/src/modules/channels/dto/create-channel.dto.ts

import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType, ChannelKind } from '../../../common/types';

export class CreateChannelDto {
  @ApiProperty({ description: '频道名称', minLength: 2, maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50, { message: '频道名称长度必须在 2-50 字符之间' })
  name: string;

  @ApiProperty({ description: '频道类型', enum: ChannelType })
  @IsEnum(ChannelType, { message: '频道类型必须是 PUBLIC 或 PRIVATE' })
  type: ChannelType;

  @ApiProperty({ description: '创建者用户ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: '创建者用户名' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '频道描述' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: '最大参与人数（仅私有频道有效）' })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(50)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: '频道密码（公开和私密频道都可设置）' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  password?: string;

  @ApiPropertyOptional({ description: '所属服务器 ID（在服务器内创建时必填）' })
  @IsOptional()
  @IsString()
  serverId?: string;

  @ApiPropertyOptional({ description: '频道形态', enum: ChannelKind })
  @IsOptional()
  @IsEnum(ChannelKind)
  kind?: ChannelKind;
}
