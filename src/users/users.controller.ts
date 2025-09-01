import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseEnumPipe
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserRole, UserStatus } from './schema/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return user.getPublicProfile();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: QueryUserDto) {
    const users = await this.usersService.findAll(query);
    return users.map(user => user.getPublicProfile());
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStats() {
    return this.usersService.getUserStats();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findOne(req.user.id);
    return user.getPublicProfile();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return user.getPublicProfile();
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    return user.getPublicProfile();
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return user.getPublicProfile();
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(UserStatus)) status: UserStatus
  ) {
    const user = await this.usersService.updateStatus(id, status);
    return user.getPublicProfile();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  // Social features
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async followUser(@Request() req: any, @Param('id') targetUserId: string) {
    await this.usersService.followUser(req.user.id, targetUserId);
    return { message: 'User followed successfully' };
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unfollowUser(@Request() req: any, @Param('id') targetUserId: string) {
    await this.usersService.unfollowUser(req.user.id, targetUserId);
    return { message: 'User unfollowed successfully' };
  }

  @Get(':id/followers')
  @UseGuards(JwtAuthGuard)
  async getFollowers(@Param('id') id: string) {
    const followers = await this.usersService.getFollowers(id);
    return followers.map(user => user.getPublicProfile());
  }

  @Get(':id/following')
  @UseGuards(JwtAuthGuard)
  async getFollowing(@Param('id') id: string) {
    const following = await this.usersService.getFollowing(id);
    return following.map(user => user.getPublicProfile());
  }
}
