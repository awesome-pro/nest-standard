
import { IsOptional, IsEnum, IsString, IsNumberString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, UserStatus } from '../schema/user.schema';

export class QueryUserDto {
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  search?: string;
}