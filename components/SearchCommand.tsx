"use client"

import { useEffect, useRef, useState } from "react"
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import type { SearchCommandProps, StockWithWatchlistStatus } from "@/lib/types";

const MIN_SEARCH_LENGTH = 2;

const rankStocks = (items: StockWithWatchlistStatus[], rawQuery: string): StockWithWatchlistStatus[] => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return items;

    const uniqueBySymbol = new Map<string, StockWithWatchlistStatus>();
    for (const item of items) {
        uniqueBySymbol.set(item.symbol, item);
    }

    return [...uniqueBySymbol.values()].sort((a, b) => {
        const aSymbol = a.symbol.toLowerCase();
        const bSymbol = b.symbol.toLowerCase();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const score = (symbol: string, name: string) => {
            if (symbol === query) return 0;
            if (symbol.startsWith(query)) return 1;
            if (name.startsWith(query)) return 2;
            if (symbol.includes(query)) return 3;
            if (name.includes(query)) return 4;
            return 5;
        };

        const scoreA = score(aSymbol, aName);
        const scoreB = score(bSymbol, bName);

        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.symbol.localeCompare(b.symbol);
    });
};

export default function SearchCommand({ renderAs = 'button', label = 'Add stock', initialStocks }: SearchCommandProps) {
    const fallbackStocks = initialStocks ?? [];
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(false)
    const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(fallbackStocks);
    const searchRequestRef = useRef(0);
    const lastQueryRef = useRef("");

    const normalizedQuery = searchTerm.trim().toLowerCase();
    const isSearchMode = normalizedQuery.length > 0;
    const hasEnoughChars = normalizedQuery.length >= MIN_SEARCH_LENGTH;
    const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                setOpen(v => !v)
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    useEffect(() => {
        if (!open) return;

        const query = normalizedQuery;

        // Show fallback/popular stocks when query is empty.
        if (!query) {
            lastQueryRef.current = "";
            setLoading(false);
            setStocks(fallbackStocks);
            return;
        }

        // Keep UI clear for very short queries.
        if (query.length < MIN_SEARCH_LENGTH) {
            setLoading(false);
            setStocks([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            if (query === lastQueryRef.current) return;

            const requestId = ++searchRequestRef.current;
            setLoading(true);

            try {
                const results = await searchStocks(query);

                // Ignore stale responses from older requests.
                if (requestId !== searchRequestRef.current) return;

                lastQueryRef.current = query;
                setStocks(rankStocks(results, query));
            } catch {
                if (requestId !== searchRequestRef.current) return;
                setStocks([]);
            } finally {
                if (requestId === searchRequestRef.current) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [normalizedQuery, open, fallbackStocks]);


    const handleSelectStock = () => {
        setOpen(false);
        setSearchTerm("");
        setStocks(fallbackStocks);
        lastQueryRef.current = "";
    }

    return (
        <>
            {renderAs === 'text' ? (
                <span onClick={() => setOpen(true)} className="search-text">
                    {label}
                </span>
            ) : (
                <Button onClick={() => setOpen(true)} className="search-btn">
                    {label}
                </Button>
            )}
            <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog">
                <div className="search-field">
                    <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search stocks..." className="search-input" />
                    {loading && <Loader2 className="search-loader" />}
                </div>
                <CommandList className="search-list">
                    {loading ? (
                        <CommandEmpty className="search-list-empty">Loading stocks...</CommandEmpty>
                    ) : isSearchMode && !hasEnoughChars ? (
                        <div className="search-list-indicator">
                            Type at least {MIN_SEARCH_LENGTH} characters to search
                        </div>
                    ) : displayStocks?.length === 0 ? (
                        <div className="search-list-indicator">
                            {isSearchMode ? 'No results found' : 'No stocks available'}
                        </div>
                    ) : (
                        <ul>
                            <div className="search-count">
                                {isSearchMode ? 'Search results' : 'Popular stocks'}
                                {` `}({displayStocks?.length || 0})
                            </div>
                            {displayStocks?.map((stock, i) => (
                                <li key={stock.symbol} className="search-item">
                                    <Link
                                        href={`/stocks/${stock.symbol}`}
                                        onClick={handleSelectStock}
                                        className="search-item-link"
                                    >
                                        <TrendingUp className="h-4 w-4 text-gray-500" />
                                        <div className="flex-1">
                                            <div className="search-item-name">
                                                {stock.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {stock.symbol} | {stock.exchange} | {stock.type}
                                            </div>
                                        </div>
                                        {/*<Star />*/}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )
                    }
                </CommandList>
            </CommandDialog>
        </>
    )
}