// backend/src/modules/channels/dto/join-channel.dto.ts

import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 加入频道 DTO
 */
export class JoinChannelDto {
  @ApiPropertyOptional({
    description: '频道密码（如果频道设置了密码）',
    example: 'password123',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
