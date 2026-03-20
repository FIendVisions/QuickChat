import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name: string;
}
