'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownCircle, ArrowUpCircle, BarChart3, RefreshCw } from 'lucide-react';

import TradeOrderModal from '@/components/trading/TradeOrderModal';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { getMockQuote } from '@/lib/trading/pricing';
import type { TradingSide } from '@/lib/types';

type StockTradePanelProps = {
    symbol: string;
    assetName?: string;
};

export default function StockTradePanel({ symbol, assetName }: StockTradePanelProps) {
    const [quote, setQuote] = useState(() => getMockQuote(symbol, assetName));
    const [activeSide, setActiveSide] = useState<TradingSide | null>(null);

    useEffect(() => {
        const refreshQuote = () => setQuote(getMockQuote(symbol, assetName));
        refreshQuote();

        const intervalId = window.setInterval(refreshQuote, 15000);

        return () => window.clearInterval(intervalId);
    }, [assetName, symbol]);

    return (
        <>
            <div className="rounded-2xl border border-gray-700 bg-gray-900/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Simulated trade desk
                        </p>
                        <h2 className="mt-3 text-xl font-semibold text-white">{assetName || symbol.toUpperCase()}</h2>
                        <p className="mt-1 text-sm text-gray-400">Buy and sell using mock market prices and a virtual wallet.</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => setQuote(getMockQuote(symbol, assetName))}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-700 bg-gray-950 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current price</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{formatPrice(quote.price)}</p>
                        <p className={quote.change >= 0 ? 'text-sm text-emerald-400' : 'text-sm text-rose-400'}>
                            {quote.change >= 0 ? '+' : ''}{formatPrice(Math.abs(quote.change))} ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent}%)
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-gray-950 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Execution mode</p>
                        <p className="mt-1 text-lg font-semibold text-white">Instant simulated fill</p>
                        <p className="text-sm text-gray-400">No brokerage, payment gateway, or live settlement is used.</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <Button className="yellow-btn h-11 px-5" onClick={() => setActiveSide('buy')}>
                        <ArrowUpCircle className="h-4 w-4" />
                        Buy shares
                    </Button>
                    <Button variant="outline" className="h-11 border-gray-700 bg-transparent px-5 text-gray-100 hover:bg-gray-800" onClick={() => setActiveSide('sell')}>
                        <ArrowDownCircle className="h-4 w-4" />
                        Sell shares
                    </Button>
                    <Button variant="ghost" asChild className="h-11 px-5 text-gray-300 hover:bg-gray-800 hover:text-white">
                        <Link href="/portfolio">View portfolio</Link>
                    </Button>
                </div>
            </div>

            <TradeOrderModal
                open={Boolean(activeSide)}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveSide(null);
                    }
                }}
                symbol={symbol.toUpperCase()}
                assetName={assetName || symbol.toUpperCase()}
                initialSide={activeSide || 'buy'}
                onTradeCompleted={undefined}
            />
        </>
    );
}