import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole, UserStatus } from './schema/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ 
      email: createUserDto.email.toLowerCase() 
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
    });

    return user.save();
  }

  async findAll(query: any = {}): Promise<UserDocument[]> {
    const { page = 1, limit = 10, role, status, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i'}},
        { email: { $regex: search, $options: 'i'}}
      ]
    }

    return this.userModel
      .find(filter)
      .select('-password -loginAttempts -lockUntil')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -loginAttempts -lockUntil')
      .populate('followers', 'name email')
      .populate('following', 'name email')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password +loginAttempts +lockUntil')
      .exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id, 
        { 
          ...updateUserDto,
          ...(updateUserDto.email && { email: updateUserDto.email.toLowerCase() })
        },
        { new: true, runValidators: true }
      )
      .select('-password -loginAttempts -lockUntil')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async updateStatus(id: string, status: UserStatus): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { status },
        { new: true }
      )
      .select('-password -loginAttempts -lockUntil')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async followUser(userId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const [user, targetUser] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel.findById(targetUserId)
    ]);

    if (!user || !targetUser) {
      throw new NotFoundException('User not found');
    }

    if (user.following.includes(targetUser._id as Types.ObjectId)) {
      throw new BadRequestException('Already following this user');
    }

    await Promise.all([
      this.userModel.findByIdAndUpdate(userId, {
        $push: { following: targetUser._id }
      }),
      this.userModel.findByIdAndUpdate(targetUserId, {
        $push: { followers: user._id }
      })
    ]);
  }

  async unfollowUser(userId: string, targetUserId: string): Promise<void> {
    const [user, targetUser] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel.findById(targetUserId)
    ]);

    if (!user || !targetUser) {
      throw new NotFoundException('User not found');
    }

    await Promise.all([
      this.userModel.findByIdAndUpdate(userId, {
        $pull: { following: targetUser._id }
      }),
      this.userModel.findByIdAndUpdate(targetUserId, {
        $pull: { followers: user._id }
      })
    ]);
  }

  async getFollowers(userId: string): Promise<UserDocument[]> {
    const user = await this.userModel
      .findById(userId)
      .populate('followers', 'name email location createdAt')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.followers as unknown as UserDocument[];
  }

  async getFollowing(userId: string): Promise<UserDocument[]> {
    const user = await this.userModel
      .findById(userId)
      .populate('following', 'name email location createdAt')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.following as unknown as UserDocument[];
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastActive: new Date()
    });
  }

  // Admin methods
  async getUserStats() {
    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ status: UserStatus.ACTIVE }),
      this.userModel.countDocuments({ role: UserRole.ADMIN })
    ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      inactiveUsers: totalUsers - activeUsers
    };
  }
}
