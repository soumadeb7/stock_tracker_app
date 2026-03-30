'use client';

import Link from 'next/link';
import { NewsArticleItem } from '@/database/models/inbox.model';

interface NewsInboxDisplayProps {
    date: string; // YYYY-MM-DD
    articles: NewsArticleItem[];
    newsContent?: string;
}

export const NewsInboxDisplay = ({ date, articles, newsContent }: NewsInboxDisplayProps) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-6">
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📈 Market Summary - {formattedDate}
                </h3>
            </div>

            {newsContent ? (
                <div
                    className="prose dark:prose-invert max-w-none mb-6 text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: newsContent }}
                />
            ) : (
                <p className="text-gray-600 dark:text-gray-400 mb-6">No AI summary available.</p>
            )}

            {articles && articles.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-4 uppercase tracking-wide">
                        Related Articles
                    </h4>
                    <div className="space-y-3">
                        {articles.map((article, idx) => (
                            <div
                                key={`${date}-${idx}`}
                                className="border border-gray-200 dark:border-slate-700 rounded p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium block text-sm"
                                        >
                                            {article.headline}
                                        </a>
                                        <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                                            {article.source}
                                            {article.symbol && (
                                                <>
                                                    {' '}
                                                    • <span className="font-semibold text-blue-600 dark:text-blue-400">${article.symbol}</span>
                                                </>
                                            )}
                                        </p>
                                        {article.summary && (
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                                                {article.summary}
                                            </p>
                                        )}
                                    </div>
                                    {article.image && (
                                        <img
                                            src={article.image}
                                            alt={article.headline}
                                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(!articles || articles.length === 0) && !newsContent && (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No articles available for this date.
                </p>
            )}
        </div>
    );
};
