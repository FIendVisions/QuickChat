// backend/src/modules/channels/dto/send-message.dto.ts

import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @IsString()
  @IsIn(['TEXT', 'SYSTEM', 'IMAGE', 'FILE'])
  type?: string;

  /** 上传接口返回的相对路径，如 /uploads/xxx */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  attachmentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  attachmentMime?: string;
}
