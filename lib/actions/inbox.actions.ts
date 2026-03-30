'use server';

import { connectToDatabase } from "@/database/mongoose";
import { NewsInbox, type NewsArticleItem } from "@/database/models/inbox.model";

export const saveNewsInboxSummary = async (
    userId: string,
    userEmail: string,
    date: string, // YYYY-MM-DD
    newsArticles: NewsArticleItem[],
    newsContent: string // HTML from Gemini
): Promise<boolean> => {
    try {
        await connectToDatabase();

        // Upsert: update if exists, create if not
        const result = await NewsInbox.updateOne(
            { userId, date },
            {
                $set: {
                    userEmail,
                    newsArticles,
                    newsContent,
                    read: false,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );

        console.log(`News inbox saved for ${userEmail} on ${date}:`, result);
        return true;
    } catch (e) {
        console.error(`Error saving news inbox for ${userEmail}:`, e);
        return false;
    }
};
