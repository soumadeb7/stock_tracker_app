'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/better-auth/client';
import { NewsInboxDisplay } from '@/components/NewsInboxDisplay';
import { redirect } from 'next/navigation';

interface NewsInboxItem {
    _id: string;
    userId: string;
    userEmail: string;
    date: string;
    newsArticles: Array<{
        headline: string;
        summary: string;
        source: string;
        url: string;
        datetime?: number;
        symbol?: string;
        image?: string;
    }>;
    newsContent: string;
    read: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function InboxPage() {
    const { data: session, isPending } = useSession();
    const [inboxItems, setInboxItems] = useState<NewsInboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isPending && !session) {
            redirect('/sign-in');
        }
    }, [session, isPending]);

    useEffect(() => {
        const fetchInbox = async () => {
            try {
                setLoading(true);

                // First, ensure test data exists for today
                try {
                    await fetch('/api/inbox/create-test-data');
                } catch (e) {
                    console.warn('Could not create test data:', e);
                }

                // Now fetch inbox
                const response = await fetch('/api/inbox');

                if (!response.ok) {
                    throw new Error('Failed to fetch inbox');
                }

                const data = await response.json();
                setInboxItems(data.items || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (session?.user) {
            fetchInbox();
        }
    }, [session?.user]);

    if (isPending || loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400">Loading your inbox...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        📬 Your News Inbox
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Personalized daily market summaries based on your watchlist
                    </p>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                        <p className="text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </p>
                    </div>
                )}

                {/* Empty State */}
                {inboxItems.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-12 text-center">
                        <div className="text-gray-400 dark:text-gray-600 text-5xl mb-4">📭</div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No news summaries yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Daily news summaries will appear here each day at 12:00 PM UTC based on your watchlist.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            💡 Tip: Add stocks to your watchlist to get personalized news summaries!
                        </p>
                    </div>
                ) : (
                    <div>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4">
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                    {inboxItems.length}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">News Summaries</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4">
                                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                    {inboxItems.reduce((acc, item) => acc + (item.newsArticles?.length || 0), 0)}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Articles</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4">
                                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                    {inboxItems.filter(item => !item.read).length}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Unread</p>
                            </div>
                        </div>

                        {/* Inbox Items */}
                        <div>
                            {inboxItems.map((item) => (
                                <NewsInboxDisplay
                                    key={item._id}
                                    date={item.date}
                                    articles={item.newsArticles || []}
                                    newsContent={item.newsContent}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
