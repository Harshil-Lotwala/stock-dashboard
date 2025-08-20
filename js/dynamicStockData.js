class DynamicStockDataManager {
  constructor() {
    this.apiKey = window.FINNHUB_API_KEY || 'd0of8thr01qsib2c9up0d0of8thr01qsib2c9upg';
    this.cachePrefix = 'stockData_';
    this.cacheExpiryKey = 'stockData_lastUpdate';
    this.cacheExpiryHours = 24;
    this.fallbackData = this.getFallbackData();
  }

  isCacheValid() {
    const lastUpdate = localStorage.getItem(this.cacheExpiryKey);
    if (!lastUpdate) return false;
    const hoursElapsed = (Date.now() - parseInt(lastUpdate)) / (1000 * 60 * 60);
    return hoursElapsed < this.cacheExpiryHours;
  }

  async getStockData(category) {
    const cacheKey = this.cachePrefix + category;
    
    if (this.isCacheValid()) {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    }

    try {
      const freshData = await this.fetchCategoryData(category);
      localStorage.setItem(cacheKey, JSON.stringify(freshData));
      localStorage.setItem(this.cacheExpiryKey, Date.now().toString());
      return freshData;
    } catch (error) {
      console.error(`Error fetching ${category} data:`, error);
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return this.fallbackData[category] || [];
    }
  }

  async fetchCategoryData(category) {
    switch (category) {
      case 'sp500':
        return await this.fetchSP500Stocks();
      case 'nasdaq100':
        return await this.fetchNASDAQ100Stocks();
      case 'dow30':
        return await this.fetchDow30Stocks();
      case 'trending':
        return await this.fetchTrendingStocks();
      case 'ai':
        return await this.fetchAIStocks();
      case 'tsx':
        return await this.fetchTSXStocks();
      default:
        return this.fallbackData[category] || [];
    }
  }

  async fetchSP500Stocks() {
    const knownSP500 = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B',
      'UNH', 'JNJ', 'JPM', 'V', 'PG', 'HD', 'MA', 'CVX', 'ABBV', 'BAC',
      'LLY', 'KO', 'AVGO', 'MRK', 'PEP', 'COST', 'XOM', 'ADBE', 'WMT',
      'TMO', 'CRM', 'ACN', 'ABT', 'NFLX', 'CSCO', 'ORCL', 'DIS', 'INTC',
      'WFC', 'CMCSA', 'NKE', 'TXN', 'VZ', 'DHR', 'PM', 'AMGN', 'NEE',
      'RTX', 'UPS', 'LOW', 'QCOM', 'HON'
    ];
    return await this.validateAndFormatStocks(knownSP500, 'NASDAQ', 'NYSE');
  }

  async fetchNASDAQ100Stocks() {
    const knownNASDAQ100 = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AVGO',
      'PEP', 'COST', 'ADBE', 'NFLX', 'CSCO', 'INTC', 'CMCSA', 'TXN',
      'AMGN', 'QCOM', 'HON', 'SBUX', 'GILD', 'INTU', 'AMD', 'BKNG',
      'ADP', 'MDLZ', 'ISRG', 'VRTX', 'MU', 'PYPL'
    ];
    return await this.validateAndFormatStocks(knownNASDAQ100, 'NASDAQ');
  }

  async fetchTrendingStocks() {
    const trendingSymbols = [
      'TSLA', 'NVDA', 'AMD', 'PLTR', 'RIVN', 'LCID', 'COIN', 'RBLX',
      'HOOD', 'SOFI', 'GME', 'AMC', 'BB', 'NOK', 'SPCE'
    ];
    return await this.validateAndFormatStocks(trendingSymbols, 'NASDAQ', 'NYSE');
  }

  async fetchAIStocks() {
    const aiSymbols = [
      'NVDA', 'GOOGL', 'MSFT', 'TSLA', 'META', 'AMZN', 'AAPL', 'PLTR',
      'CRM', 'SNOW', 'ADBE', 'NOW', 'INTC', 'AMD', 'ORCL', 'IBM',
      'NFLX', 'UBER', 'LYFT', 'RBLX'
    ];
    return await this.validateAndFormatStocks(aiSymbols, 'NASDAQ', 'NYSE');
  }

  async fetchDow30Stocks() {
    const dow30Symbols = [
      'AAPL', 'MSFT', 'UNH', 'JNJ', 'JPM', 'V', 'PG', 'HD', 'CVX',
      'MRK', 'BAC', 'ABBV', 'KO', 'PEP', 'COST', 'AVGO', 'XOM',
      'LLY', 'WMT', 'TMO', 'ACN', 'ABT', 'CSCO', 'DIS', 'WFC',
      'NKE', 'TXN', 'VZ', 'PM', 'NEE'
    ];
    return await this.validateAndFormatStocks(dow30Symbols, 'NASDAQ', 'NYSE');
  }

  async fetchTSXStocks() {
    const tsxSymbols = [
      'SHOP', 'RY', 'TD', 'BNS', 'BMO', 'CM', 'CNR', 'SU', 'ENB',
      'TRI', 'ABX', 'CP', 'MFC', 'WCN', 'CSU'
    ];
    return tsxSymbols.map(symbol => ({
      symbol,
      name: this.getTSXCompanyName(symbol),
      exchange: 'TSX'
    }));
  }

  async validateAndFormatStocks(symbols, ...possibleExchanges) {
    const validStocks = [];
    const batchSize = 5;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          const profileResponse = await fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${this.apiKey}`
          );
          
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            if (profile.name && profile.exchange) {
              return {
                symbol: symbol,
                name: profile.name,
                exchange: this.mapExchange(profile.exchange) || this.determineExchange(symbol, possibleExchanges)
              };
            }
          }
        } catch (error) {
          console.warn(`Failed to validate ${symbol}:`, error);
        }

        return {
          symbol: symbol,
          name: this.getCompanyNameFallback(symbol),
          exchange: this.determineExchange(symbol, possibleExchanges)
        };
      });

      const batchResults = await Promise.all(batchPromises);
      validStocks.push(...batchResults.filter(stock => stock !== null));

      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return validStocks;
  }

  mapExchange(exchangeName) {
    const exchangeMap = {
      'NASDAQ': 'NASDAQ',
      'NYSE': 'NYSE', 
      'NYSEAMERICAN': 'NYSE',
      'NYSEARCA': 'NYSE',
      'TSX': 'TSX',
      'TSE': 'TSE',
      'LSE': 'LSE',
      'ASX': 'ASX'
    };
    return exchangeMap[exchangeName?.toUpperCase()] || exchangeName;
  }

  determineExchange(symbol, possibleExchanges = ['NASDAQ', 'NYSE']) {
    const nasdaqSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA',
      'NFLX', 'ADBE', 'PYPL', 'INTC', 'CMCSA', 'COST', 'PEP', 'AVGO',
      'TXN', 'QCOM', 'SBUX', 'GILD', 'INTU', 'AMD', 'BKNG'
    ];
    
    if (nasdaqSymbols.includes(symbol)) {
      return 'NASDAQ';
    }
    return possibleExchanges[0] || 'NYSE';
  }

  getCompanyNameFallback(symbol) {
    const nameMap = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc. Class A',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corporation',
      'META': 'Meta Platforms Inc.',
      'NFLX': 'Netflix Inc.'
    };
    return nameMap[symbol] || `${symbol} Corporation`;
  }

  getTSXCompanyName(symbol) {
    const tsxNames = {
      'SHOP': 'Shopify Inc.',
      'RY': 'Royal Bank of Canada',
      'TD': 'Toronto-Dominion Bank',
      'BNS': 'Bank of Nova Scotia',
      'BMO': 'Bank of Montreal',
      'CM': 'Canadian Imperial Bank of Commerce',
      'CNR': 'Canadian National Railway Co.',
      'SU': 'Suncor Energy Inc.',
      'ENB': 'Enbridge Inc.',
      'TRI': 'Thomson Reuters Corp.',
      'ABX': 'Barrick Gold Corp.',
      'CP': 'Canadian Pacific Railway Ltd.',
      'MFC': 'Manulife Financial Corp.',
      'WCN': 'Waste Connections Inc.',
      'CSU': 'Constellation Software Inc.'
    };
    return tsxNames[symbol] || `${symbol} Corp.`;
  }

  getFallbackData() {
    return {
      sp500: [
        { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
        { symbol: "GOOGL", name: "Alphabet Inc. Class A", exchange: "NASDAQ" },
        { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
        { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
        { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
        { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" },
        { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B", exchange: "NYSE" },
        { symbol: "UNH", name: "UnitedHealth Group Inc.", exchange: "NYSE" },
        { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE" }
      ],
      nasdaq100: [
        { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
        { symbol: "GOOGL", name: "Alphabet Inc. Class A", exchange: "NASDAQ" },
        { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
        { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" }
      ],
      dow30: [
        { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
        { symbol: "UNH", name: "UnitedHealth Group Inc.", exchange: "NYSE" },
        { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE" },
        { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE" }
      ],
      trending: [
        { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
        { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
        { symbol: "AMD", name: "Advanced Micro Devices Inc.", exchange: "NASDAQ" },
        { symbol: "PLTR", name: "Palantir Technologies Inc.", exchange: "NYSE" },
        { symbol: "RIVN", name: "Rivian Automotive Inc.", exchange: "NASDAQ" }
      ],
      ai: [
        { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
        { symbol: "GOOGL", name: "Alphabet Inc. Class A", exchange: "NASDAQ" },
        { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
        { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
        { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" }
      ],
      tsx: [
        { symbol: "SHOP", name: "Shopify Inc.", exchange: "TSX" },
        { symbol: "RY", name: "Royal Bank of Canada", exchange: "TSX" },
        { symbol: "TD", name: "Toronto-Dominion Bank", exchange: "TSX" },
        { symbol: "BNS", name: "Bank of Nova Scotia", exchange: "TSX" },
        { symbol: "BMO", name: "Bank of Montreal", exchange: "TSX" }
      ]
    };
  }

  async refreshAllData() {
    localStorage.removeItem(this.cacheExpiryKey);
    const categories = ['sp500', 'nasdaq100', 'dow30', 'trending', 'ai', 'tsx'];
    const refreshPromises = categories.map(category => this.getStockData(category));
    await Promise.all(refreshPromises);
  }
}

window.dynamicStockDataManager = new DynamicStockDataManager();

window.STOCK_DATA = new Proxy({}, {
  get(target, prop) {
    return async () => {
      return await window.dynamicStockDataManager.getStockData(prop);
    };
  }
});

window.STOCK_DATA_SYNC = {
  get: (category) => {
    const cacheKey = window.dynamicStockDataManager.cachePrefix + category;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    return window.dynamicStockDataManager.fallbackData[category] || [];
  }
};
