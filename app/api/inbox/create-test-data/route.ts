import { getAuthInstance } from '@/lib/better-auth/init';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Get current user session
        const auth = await getAuthInstance();
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const userEmail = session.user.email || '';

        await connectToDatabase();
        const db = (await connectToDatabase()).connection.db;

        if (!db) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Check if inbox entry exists for today
        const existingEntry = await db.collection('newsinboxes').findOne({
            userId,
            date: today,
        });

        if (existingEntry) {
            // Already exists, return it
            return NextResponse.json({ success: true, existing: true });
        }

        // Create test data for today
        const testNewsData = {
            userId,
            userEmail,
            date: today,
            newsArticles: [
                {
                    headline: "Tech stocks rally on AI optimism",
                    summary: "Major technology stocks surged today following positive earnings reports from AI chip manufacturers.",
                    source: "MarketWatch",
                    url: "https://www.marketwatch.com",
                    datetime: Date.now(),
                    symbol: "TECH",
                    image: undefined
                },
                {
                    headline: "Federal Reserve signals potential rate cuts",
                    summary: "The Federal Reserve indicated that interest rate cuts may be on the horizon if inflation continues to cool.",
                    source: "Reuters",
                    url: "https://www.reuters.com",
                    datetime: Date.now() - 3600000,
                    symbol: undefined,
                    image: undefined
                },
                {
                    headline: "Apple announces new product line",
                    summary: "Apple revealed its latest innovation in consumer electronics, with focus on sustainability and performance.",
                    source: "TechCrunch",
                    url: "https://www.techcrunch.com",
                    datetime: Date.now() - 7200000,
                    symbol: "AAPL",
                    image: undefined
                },
                {
                    headline: "Oil prices rise amid supply concerns",
                    summary: "Crude oil prices increased 3% today due to ongoing geopolitical tensions affecting global supply chains.",
                    source: "CNBC",
                    url: "https://www.cnbc.com",
                    datetime: Date.now() - 10800000,
                    symbol: undefined,
                    image: undefined
                },
                {
                    headline: "Goldman Sachs upgrades retail sector",
                    summary: "Goldman Sachs raised its rating on the retail sector, citing strong consumer spending trends.",
                    source: "Bloomberg",
                    url: "https://www.bloomberg.com",
                    datetime: Date.now() - 14400000,
                    symbol: undefined,
                    image: undefined
                },
                {
                    headline: "Earnings season kicks off with strong results",
                    summary: "Companies reporting this week showed better-than-expected earnings, boosting market sentiment.",
                    source: "Financial Times",
                    url: "https://www.ft.com",
                    datetime: Date.now() - 18000000,
                    symbol: undefined,
                    image: undefined
                }
            ],
            newsContent: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2>Today's Market Summary</h2>
          <p>Markets showed positive momentum today with technology stocks leading the gains. The S&P 500 rose 1.2% while the Nasdaq gained 1.8% on the back of strong earnings reports and optimistic economic outlook.</p>
          
          <h3>Key Highlights</h3>
          <ul>
            <li><strong>Technology Sector:</strong> AI-related stocks surged following positive earnings surprises from chip manufacturers.</li>
            <li><strong>Interest Rates:</strong> Federal Reserve signals potential rate cuts may be coming, easing recession concerns.</li>
            <li><strong>Consumer Spending:</strong> Retail sector upgraded by analysts due to strong consumer activity.</li>
            <li><strong>Energy:</strong> Oil prices rose 3% on supply concerns amid geopolitical developments.</li>
          </ul>
          
          <h3>Market Movers</h3>
          <p>Apple reached new highs after announcing sustainable product innovations, while fintech stocks rallied on positive regulatory developments. The broader market sentiment remains bullish as earnings season progresses.</p>
        </div>
      `,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Insert test data
        await db.collection('newsinboxes').insertOne(testNewsData);

        return NextResponse.json({ success: true, created: true, message: "Test data created for today" });
    } catch (error) {
        console.error('[API] /inbox/create-test-data error:', error);
        return NextResponse.json(
            { error: 'Failed to create test data' },
            { status: 500 }
        );
    }
}
