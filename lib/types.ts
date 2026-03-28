export type User = {
    name: string;
    email: string;
};

export type StockWithWatchlistStatus = {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    isInWatchlist?: boolean;
};

export type SearchCommandProps = {
    renderAs?: "button" | "text";
    label?: string;
    initialStocks?: StockWithWatchlistStatus[];
};

export type WatchlistButtonProps = {
    symbol: string;
    company: string;
    isInWatchlist: boolean;
    showTrashIcon?: boolean;
    type?: "button" | "icon";
    onWatchlistChange?: (symbol: string, isInWatchlist: boolean) => void;
};
