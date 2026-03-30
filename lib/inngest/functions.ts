import { inngest } from "@/lib/inngest/client";
import { getFormattedTodayDate } from "@/lib/utils";
import { connectToDatabase } from "@/database/mongoose";
import { NewsInbox, type NewsArticleItem } from "@/database/models/inbox.model";
import { sendWelcomeEmail, sendNewsSummaryEmail } from "@/lib/nodemailer";

const PERSONALIZED_WELCOME_EMAIL_PROMPT = `
Write a short, friendly onboarding intro for a new Signalist user.
Use this profile:
{{userProfile}}
`;

const NEWS_SUMMARY_EMAIL_PROMPT = `
Summarize these market news items into a concise daily email digest.
Focus on important movements and keep tone practical.
News:
{{newsData}}
`;

type UserForNewsEmail = {
    id: string;
    email: string;
    name?: string;
};

type MarketNewsArticle = {
    id: number;
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    category: string;
    related: string;
    image?: string;
};

// Helper: Get all users for news delivery
async function getAllUsersForNewsEmail(): Promise<UserForNewsEmail[]> {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Mongoose connection not connected');

        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null } },
            { projection: { _id: 1, id: 1, email: 1, name: 1 } }
        ).toArray();

        return users.filter((user) => user.email && user.name).map((user) => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name
        }))
    } catch (e) {
        console.error('Error fetching users for news email:', e)
        return []
    }
}

// Helper: Get watchlist symbols for a user by email
async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Mongoose connection not connected');

        const user = await db.collection('user').findOne(
            { email },
            { projection: { _id: 1, id: 1 } }
        );

        if (!user) return [];

        const userId = user.id || user._id?.toString() || '';
        if (!userId) return [];

        const watchlistItems = await db.collection('watchlist').find(
            { userId },
            { projection: { symbol: 1 } }
        ).toArray();

        return watchlistItems
            .map((item: any) => item.symbol)
            .filter((symbol): symbol is string => Boolean(symbol));
    } catch (e) {
        console.error('Error fetching watchlist symbols for email:', email, e);
        return [];
    }
}

// Helper: Get news from Finnhub (reused from actions)
async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
    try {
        const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
        const token = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

        if (!token) {
            throw new Error('FINNHUB API key is not configured');
        }

        const cleanSymbols = (symbols || [])
            .map((s) => s?.trim().toUpperCase())
            .filter((s): s is string => Boolean(s));

        // Simplified: fetch general news if symbols provided or not
        const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
        const response = await fetch(generalUrl);
        const data = await response.json();

        return (data || [])
            .slice(0, 6)
            .map((article: any, idx: number) => ({
                id: idx,
                headline: article.headline || '',
                summary: article.summary || '',
                source: article.source || 'Unknown',
                url: article.url || '',
                datetime: article.datetime || Date.now(),
                category: article.category || 'general',
                related: article.related || '',
                image: article.image || undefined
            }));
    } catch (e) {
        console.error('Error fetching news:', e);
        return [];
    }
}

// Helper: Save news to inbox database
async function saveNewsInboxSummary(
    userId: string,
    userEmail: string,
    date: string,
    newsArticles: NewsArticleItem[],
    newsContent: string
): Promise<boolean> {
    try {
        await connectToDatabase();

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

        console.log(`[Inngest] News inbox saved for ${userEmail} on ${date}`);
        return true;
    } catch (e) {
        console.error(`[Inngest] Error saving news inbox for ${userEmail}:`, e);
        return false;
    }
}

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email', triggers: [{ event: 'app/user.created' }] },
    async ({ event, step }) => {
        const payload = (event.data ?? {}) as Record<string, string | undefined>;

        const userProfile = `
            - Country: ${payload.country ?? 'N/A'}
            - Investment goals: ${payload.investmentGoals ?? 'N/A'}
            - Risk tolerance: ${payload.riskTolerance ?? 'N/A'}
            - Preferred industry: ${payload.preferredIndustry ?? 'N/A'}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }]
            }
        })

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) || 'Thanks for joining Signalist. You now have the tools to track markets and make smarter moves.'

            const email = payload.email ?? '';
            const name = payload.name ?? 'Investor';

            if (!email) return false;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary', triggers: [{ event: 'app/send.daily.news' }, { cron: '0 12 * * *' }] },
    async ({ step }) => {
        // Step #1: Get all users for news delivery
        const users = await step.run('get-all-users', async () => {
            const fetchedUsers = await getAllUsersForNewsEmail();
            return fetchedUsers as UserForNewsEmail[];
        });

        if (!users || users.length === 0) {
            return { success: false, message: 'No users found for news email' };
        }

        console.log(`[Daily News] Found ${users.length} users for news delivery`);

        // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{ user: UserForNewsEmail; articles: MarketNewsArticle[] }> = [];
            for (const user of users) {
                try {
                    console.log(`[Daily News] Fetching watchlist for ${user.email}`);
                    const symbols = await getWatchlistSymbolsByEmail(user.email);

                    let articles = (symbols.length > 0) ? await getNews(symbols) : [];

                    // Enforce max 6 articles per user
                    articles = (articles || []).slice(0, 6);

                    // If still empty, fallback to general news
                    if (!articles || articles.length === 0) {
                        console.log(`[Daily News] No watchlist news for ${user.email}, fetching general news`);
                        articles = await getNews();
                        articles = (articles || []).slice(0, 6);
                    }

                    perUser.push({ user, articles });
                } catch (e) {
                    console.error(`[Daily News] Error preparing user news for ${user.email}:`, e);
                    perUser.push({ user, articles: [] });
                }
            }
            return perUser;
        });

        console.log(`[Daily News] Prepared news for ${results.length} users`);

        // Step #3: Summarize news via AI
        const userNewsSummaries: {
            user: UserForNewsEmail;
            newsContent: string | null;
            articles: MarketNewsArticle[];
        }[] = [];

        for (const { user, articles } of results) {
            try {
                if (!articles || articles.length === 0) {
                    userNewsSummaries.push({ user, newsContent: '<p>No market news available today.</p>', articles: [] });
                    continue;
                }

                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));

                const response = await step.ai.infer(`summarize-news-${user.email}`, {
                    model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                    body: {
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    }
                });

                const part = response.candidates?.[0]?.content?.parts?.[0];
                const newsContent = (part && 'text' in part ? part.text : null) || '<p>Market news summary generation failed.</p>';

                userNewsSummaries.push({ user, newsContent, articles });
            } catch (e) {
                console.error(`[Daily News] Failed to summarize news for ${user.email}:`, e);
                userNewsSummaries.push({ user, newsContent: null, articles: [] });
            }
        }

        // Step #4: Save to inbox and send emails
        const today = getFormattedTodayDate();

        await step.run('save-and-send-news', async () => {
            const sendPromises = userNewsSummaries.map(async ({ user, newsContent, articles }) => {
                try {
                    if (!newsContent || !user.email) {
                        console.warn(`[Daily News] Skipping ${user.email}: no content or email`);
                        return false;
                    }

                    // Save to database inbox
                    if (user.id) {
                        await saveNewsInboxSummary(
                            user.id,
                            user.email,
                            today,
                            articles.map(a => ({
                                headline: a.headline,
                                summary: a.summary,
                                source: a.source,
                                url: a.url,
                                datetime: a.datetime,
                                image: a.image
                            })),
                            newsContent
                        );
                    }

                    // Send email
                    await sendNewsSummaryEmail({ email: user.email, date: today, newsContent });

                    console.log(`[Daily News] Sent summary email to ${user.email}`);
                    return true;
                } catch (e) {
                    console.error(`[Daily News] Failed to save/send for ${user.email}:`, e);
                    return false;
                }
            });

            const results = await Promise.allSettled(sendPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
            console.log(`[Daily News] Successfully processed ${successful}/${userNewsSummaries.length} users`);
        });

        return {
            success: true,
            message: `Daily news summary processed for ${userNewsSummaries.length} users`
        };
    }
);