import type { StockWithWatchlistStatus } from "@/lib/types";

export async function searchStocks(
    query: string,
): Promise<StockWithWatchlistStatus[]> {
    if (!query.trim()) return [];

    // Placeholder implementation keeps UI functional until API integration is added.
    return [];
}
