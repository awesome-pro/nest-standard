import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import * as bcrypt from 'bcrypt';

export interface UserMethods {
    getPublicProfile(): Record<string, any>;
    isAccountLocked(): boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
    addRefreshToken(token: string): Promise<void>;
    removeRefreshToken(token: string): Promise<void>;
    hasRefreshToken(token: string): Promise<boolean>
    clearRefreshTokens(): Promise<void>;
}

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED  = 'suspended'
}

export type UserDocument = User & Document & UserMethods

@Schema({
    timestamps: true,
    collection: 'users',
    toJSON: {
        transform: function(doc, ret: Record<string, any>) {
            const transformed = {
                id: ret._id,
                ...ret,
            };

            const { _id, __v, password, refreshTokens, ...rest } = transformed as Record<string, any>;

            return rest;
        },
    }
})
export class User {
    @Prop({
        required: true,
        trim: true,
        minLength: 2,
        index: true,
    })
    name: string

    @Prop({
        required: true,
        trim: true,
        minLength: 2,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        index: true,
    })
    email: string

    @Prop({
        required: true,
        minLength: 6,
        select: false,
    })
    password: string

    @Prop({
        type: String,
        enum: UserRole,
        default: UserRole.USER,
        index: true
    })
    role: UserRole

    @Prop({
        type: String,
        enum: UserStatus,
        default: UserStatus.ACTIVE,
        index: true
    })
    status: UserStatus

    @Prop({
        type: {
            city: {
                type: String, trim: true
            },
            country: {
                type: String, trim: true
            }
        }
    })
    location?: {
        city?: string;
        country?: string
    }


    @Prop({
        type: [{ type: Types.ObjectId, ref: 'User'}],
        default: []
    })
    followers: Types.ObjectId[]

    @Prop({
        type: [{ type: Types.ObjectId, ref: 'User'}],
        default: []
    })
    following: Types.ObjectId[]

    @Prop({
        type: Date,
        default: Date.now()
    })
    lastActive: Date

    @Prop({
        type: Number,
        default: 0,
        max: 5
    })
    loginAttempts: number

    @Prop({
        type: Date
    })
    lockUntil?: Date

    @Prop({
        type: [String],
        default: [],
        select: false
    })
    refreshTokens: string[]
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, status: 1})
UserSchema.index({ role: 1, status: 1})

UserSchema.pre('save', async function (next) {
    if (this.isModified('lastActive') === false){
        this.lastActive = new Date()
    }

    // Hash password if it's modified
    if (this.isModified('password')) {
        const saltRounds = 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
    }

    // Reset login attempts on successful password change
    if (this.isModified('password') && this.loginAttempts > 0) {
        this.loginAttempts = 0;
        this.lockUntil = undefined;
    }

    next()
})

UserSchema.statics.findByEmail = function(email: string){
    return this.findOne({ email: email.toLowerCase()})
}

UserSchema.methods.getPublicProfile = function() {
    const user = this.toObject()
    delete user.password;
    delete user.loginAttempts;
    delete user.lockUntil;
    return user;
}

UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
}

UserSchema.methods.isAccountLocked = function(): boolean {
    return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
}

// Virtual for checking if account is locked
UserSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

// Method to increment login attempts
UserSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil.getTime() < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates: any = { $inc: { loginAttempts: 1 } };
    
    // Lock the account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
}

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
}

UserSchema.methods.addRefreshToken = async function (token:string) {
    const salt = await bcrypt.genSalt(12)
    const hashed = await bcrypt.hash(token, salt);
    this.refreshTokens.push(hashed)
    await this.save()
}

UserSchema.methods.removeRefreshToken = async function (token:string) {
    this.refreshTokens = await Promise.all(
        this.refreshTokens.filter(async (stored: string) => !(await bcrypt.compare(token, stored)))
    )
    await this.save();
}

UserSchema.methods.hasRefreshToken = async function (token:string) {
    for (const stored of this.refreshTokens){
        if (await bcrypt.compare(token, stored)) return true;
    }
    return false;
}

UserSchema.methods.clearRefreshTokens = async function () {
    this.refreshTokens=[]
    await this.save();
}