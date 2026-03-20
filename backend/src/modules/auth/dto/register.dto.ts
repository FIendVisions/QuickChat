import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 注册 DTO：长度与格式校验，降低注入与暴力破解面（配合服务端哈希与统一错误信息）
 */
export class RegisterDto {
  @ApiProperty({ example: 'player01', minLength: 2, maxLength: 32 })
  @IsString()
  @Length(2, 32, { message: '用户名长度为 2-32 个字符' })
  @Matches(/^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/, {
    message: '用户名仅允许字母、数字、下划线、连字符与中文',
  })
  username!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'SecurePass1', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: '密码至少 8 个字符' })
  @MaxLength(72, { message: '密码过长' })
  password!: string;
}
