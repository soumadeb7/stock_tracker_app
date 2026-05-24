import type { TradingSide } from '@/lib/types';

type MockAssetSeed = {
    symbol: string;
    assetName: string;
    exchange: string;
    type: string;
    basePrice: number;
    volatility: number;
};

export type TradingQuote = {
    symbol: string;
    assetName: string;
    price: number;
    change: number;
    changePercent: number;
    asOf: string;
    side?: TradingSide;
};

export const MOCK_TRADING_ASSETS: MockAssetSeed[] = [
    { symbol: 'AAPL', assetName: 'Apple Inc.', exchange: 'NASDAQ', type: 'Equity', basePrice: 210.45, volatility: 0.028 },
    { symbol: 'MSFT', assetName: 'Microsoft Corp.', exchange: 'NASDAQ', type: 'Equity', basePrice: 428.12, volatility: 0.024 },
    { symbol: 'NVDA', assetName: 'NVIDIA Corp.', exchange: 'NASDAQ', type: 'Equity', basePrice: 119.83, volatility: 0.042 },
    { symbol: 'AMZN', assetName: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'Equity', basePrice: 186.22, volatility: 0.03 },
    { symbol: 'TSLA', assetName: 'Tesla Inc.', exchange: 'NASDAQ', type: 'Equity', basePrice: 248.9, volatility: 0.06 },
    { symbol: 'GOOGL', assetName: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'Equity', basePrice: 178.76, volatility: 0.022 },
    { symbol: 'META', assetName: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'Equity', basePrice: 492.13, volatility: 0.031 },
    { symbol: 'SPY', assetName: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', type: 'ETF', basePrice: 531.34, volatility: 0.012 },
];

const PRICE_BUCKET_MS = 5 * 60 * 1000;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const hashSymbol = (symbol: string) => {
    let hash = 0;

    for (let index = 0; index < symbol.length; index += 1) {
        hash = (hash * 31 + symbol.charCodeAt(index)) >>> 0;
    }

    return hash;
};

const getSeed = (symbol: string) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    const hash = hashSymbol(cleanSymbol);
    const asset = MOCK_TRADING_ASSETS.find((item) => item.symbol === cleanSymbol);

    return {
        cleanSymbol,
        assetName: asset?.assetName || cleanSymbol,
        basePrice: asset?.basePrice || 25 + (hash % 7000) / 20,
        volatility: asset?.volatility || 0.018 + ((hash % 7) / 100),
    };
};

const computePriceForBucket = (symbol: string, bucket: number) => {
    const { basePrice, volatility } = getSeed(symbol);
    const cycle = bucket + hashSymbol(symbol.toUpperCase());
    const oscillation = Math.sin(cycle * 0.71) * volatility * 0.75 + Math.cos(cycle * 0.37) * volatility * 0.55;
    const price = Math.max(basePrice * (1 + oscillation), 0.5);

    return roundMoney(price);
};

export function getMockAssetName(symbol: string) {
    return getSeed(symbol).assetName;
}

export function getMockQuote(symbol: string, assetName?: string): TradingQuote {
    const cleanSymbol = symbol.trim().toUpperCase();
    const now = Date.now();
    const currentBucket = Math.floor(now / PRICE_BUCKET_MS);
    const previousBucket = currentBucket - 1;
    const currentPrice = computePriceForBucket(cleanSymbol, currentBucket);
    const previousPrice = computePriceForBucket(cleanSymbol, previousBucket);
    const change = roundMoney(currentPrice - previousPrice);
    const changePercent = previousPrice > 0 ? roundMoney((change / previousPrice) * 100) : 0;

    return {
        symbol: cleanSymbol,
        assetName: assetName?.trim() || getMockAssetName(cleanSymbol),
        price: currentPrice,
        change,
        changePercent,
        asOf: new Date(now).toISOString(),
    };
}