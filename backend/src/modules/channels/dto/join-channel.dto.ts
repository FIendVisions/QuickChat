// backend/src/modules/channels/dto/join-channel.dto.ts

import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinChannelDto {
  @ApiProperty({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '用户名' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '频道密码（如果频道设置了密码）' })
  @IsOptional()
  @IsString()
  password?: string;
}
