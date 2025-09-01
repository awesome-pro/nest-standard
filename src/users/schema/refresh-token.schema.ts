import { Prop, Schema } from "@nestjs/mongoose";
import { Types } from "mongoose";


@Schema({
    timestamps: true,
    collection: 'refreshTokens',
    toJSON: {
        transform: function(doc, ret: Record<string, any>){
            const transformed = {
                id: ret._id,
                ...ret,
            };

            const { _id, __v, ...rest } = transformed as Record<string, any>;

            return rest;
        }
    }
})
export class RefreshToken {

    @Prop({
        required: true,
        type: String,
    })
    token: string

    @Prop({
        type: Boolean
    })
    isRevoked: boolean

    @Prop({
        type: Date,
    })
    revokedAt?: Date
}