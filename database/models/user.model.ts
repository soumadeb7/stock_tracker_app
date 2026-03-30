import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface UserDocument extends Document {
    id?: string;
    name: string;
    email: string;
    password?: string;
    emailVerified: boolean;
    image?: string;
    country?: string;
    investmentGoals?: string;
    riskTolerance?: string;
    preferredIndustry?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String },
        emailVerified: { type: Boolean, default: false },
        image: { type: String },
        country: { type: String },
        investmentGoals: { type: String },
        riskTolerance: { type: String },
        preferredIndustry: { type: String },
    },
    { timestamps: true, collection: 'user' }
);

export const User: Model<UserDocument> = (
    models.user || model<UserDocument>('user', UserSchema)
) as Model<UserDocument>;
