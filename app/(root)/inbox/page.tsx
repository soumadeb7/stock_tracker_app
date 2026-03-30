'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/better-auth/client';
import { useRouter } from 'next/navigation';
import { NewsInboxDisplay } from '@/components/NewsInboxDisplay';

type InboxItem = {
    _id: string;
    date: string;
    newsArticles: Array<{
        headline: string;
        summary: string;
        source: string;
        url: string;
        datetime: number;
        symbol?: string;
        image?: string;
    }>;
    newsContent?: string;
    read?: boolean;
};

export default function InboxPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [items, setItems] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!isPending && !session?.user) {
            router.push('/sign-in');
        }
    }, [isPending, session, router]);

    useEffect(() => {
        const loadInbox = async () => {
            if (!session?.user) return;

            setLoading(true);
            setError('');

            try {
                await fetch('/api/inbox/create-test-data', {
                    method: 'GET',
                    credentials: 'include',
                });

                const res = await fetch('/api/inbox', {
                    method: 'GET',
                    credentials: 'include',
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to fetch inbox');
                }

                setItems(Array.isArray(data?.items) ? data.items : []);
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Failed to load inbox';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        if (!isPending && session?.user) {
            loadInbox();
        }
    }, [isPending, session]);

    const stats = useMemo(() => {
        const summaries = items.length;
        const articles = items.reduce((acc, item) => acc + (item.newsArticles?.length || 0), 0);
        const unread = items.filter((item) => !item.read).length;
        return { summaries, articles, unread };
    }, [items]);

    if (isPending || loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-gray-500">Loading inbox...</p>
            </div>
        );
    }

    if (!session?.user) return null;

    return (
        <section className="max-w-5xl mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inbox</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Daily market summaries and related articles.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
                    <p className="text-xs text-gray-500">Summaries</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.summaries}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
                    <p className="text-xs text-gray-500">Articles</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.articles}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
                    <p className="text-xs text-gray-500">Unread</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.unread}</p>
                </div>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 mb-6">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            ) : null}

            {items.length === 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-8 text-center bg-white dark:bg-slate-900">
                    <p className="text-gray-600 dark:text-gray-400">No inbox items yet for your account.</p>
                </div>
            ) : (
                <div>
                    {items.map((item) => (
                        <NewsInboxDisplay
                            key={item._id}
                            date={item.date}
                            articles={item.newsArticles || []}
                            newsContent={item.newsContent}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
