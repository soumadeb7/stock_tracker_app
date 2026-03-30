import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface NewsArticleItem {
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime?: number;
    symbol?: string;
    image?: string;
}

export interface NewsInboxItem extends Document {
    userId: string;
    userEmail: string;
    date: string; // YYYY-MM-DD format
    newsArticles: NewsArticleItem[];
    newsContent: string; // HTML version from AI summary
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NewsInboxSchema = new Schema<NewsInboxItem>(
    {
        userId: { type: String, required: true, index: true },
        userEmail: { type: String, required: true, index: true },
        date: { type: String, required: true, index: true }, // YYYY-MM-DD
        newsArticles: [
            {
                headline: { type: String, required: true },
                summary: { type: String, required: true },
                source: { type: String, required: true },
                url: { type: String, required: true },
                datetime: { type: Number },
                symbol: { type: String },
                image: { type: String },
            }
        ],
        newsContent: { type: String, default: '' }, // HTML
        read: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

// Compound index for unique daily inbox per user
NewsInboxSchema.index({ userId: 1, date: 1 }, { unique: true });

export const NewsInbox: Model<NewsInboxItem> = models.NewsInbox || model('NewsInbox', NewsInboxSchema);
