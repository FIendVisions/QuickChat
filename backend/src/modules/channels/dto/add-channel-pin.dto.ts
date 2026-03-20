import { IsString, IsNotEmpty } from 'class-validator';

export class AddChannelPinDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
