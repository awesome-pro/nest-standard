import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserRole, UserStatus } from 'src/users/schema/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    return user;
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: any }> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new ForbiddenException(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      );
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(loginDto.password);

    // if (!isPasswordValid) {
    //   // Increment login attempts
    //   await user.incLoginAttempts();
    //   throw new UnauthorizedException('Invalid credentials');
    // }

    // // Reset login attempts on successful login
    // if (user.loginAttempts > 0) {
    //   await user.resetLoginAttempts();
    // }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Update last active
    await this.usersService.updateLastActive(user.id);

    return {
      accessToken,
      user: user.getPublicProfile(),
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmailWithPassword(
      (await this.usersService.findOne(userId)).email,
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(
      changePasswordDto.currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password
    user.password = changePasswordDto.newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailWithPassword(email);
    
    if (user && (await user.comparePassword(password))) {
      return user.getPublicProfile();
    }
    
    return null;
  }

  async refreshToken(user: any): Promise<{ accessToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  generateCookieOptions() {
    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
    
    return {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    };
  }
}
