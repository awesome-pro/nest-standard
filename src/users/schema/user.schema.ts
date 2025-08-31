import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export interface UserMethods {
    getPublicProfile(): Record<string, any>,
    isAccountLocked(): boolean
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

            const { _id, __v, password, ...rest } = transformed as Record<string, any>;

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
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, status: 1})
UserSchema.index({ role: 1, status: 1})

UserSchema.pre('save', async function (next) {
    if (this.isModified('lastActive') === false){
        this.lastActive = new Date()
    }
    next()
})

UserSchema.statics.findByEmail = function(email: string){
    return this.findOne({ email: email.toLowerCase()})
}

UserSchema.methods.getPublicProfile = function() {
    const user = this.toObject()
    delete user.password;
    return user;
}