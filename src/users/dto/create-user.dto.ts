import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateNested
} from 'class-validator'
import { UserRole, UserStatus } from '../schema/user.schema';
import { Type } from 'class-transformer';

export class LocationDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    city: string

    @IsOptional()
    @IsString()
    @MaxLength(100)
    country: string
}

export class CreateUserDto {
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    name: string

    @IsEmail()
    @MaxLength(100)
    email: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole

    @IsString()
    @MinLength(8)
    @MaxLength(20)
    password: string;

    @IsOptional()
    @IsEnum(UserStatus)
    status: UserStatus


    @IsOptional()
    @ValidateNested()
    @Type(() => LocationDto)
    location?: LocationDto
}