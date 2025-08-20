class WatchlistManager {
  constructor() {
    this.watchlist = this.loadWatchlist();
    this.currentStock = null;
    this.searchTimeout = null;
  }

  loadWatchlist() {
    const saved = localStorage.getItem('stockWatchlist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved watchlist:', e);
      }
    }
    return [...DEFAULT_WATCHLIST];
  }

  saveWatchlist() {
    localStorage.setItem('stockWatchlist', JSON.stringify(this.watchlist));
  }

  addStock(stock) {
    if (!this.watchlist.find(s => s.symbol === stock.symbol)) {
      this.watchlist.push(stock);
      this.saveWatchlist();
      this.renderWatchlist();
      return true;
    }
    return false;
  }

  removeStock(symbol) {
    this.watchlist = this.watchlist.filter(s => s.symbol !== symbol);
    this.saveWatchlist();
    this.renderWatchlist();
  }

  clearWatchlist() {
    this.watchlist = [];
    this.saveWatchlist();
    this.renderWatchlist();
  }

  async loadCategory(category) {
    try {
      if (window.dynamicStockDataManager) {
        const categoryData = await window.dynamicStockDataManager.getStockData(category);
        this.watchlist = [...categoryData];
        this.saveWatchlist();
        this.renderWatchlist();
        return;
      }
      
      if (window.STOCK_DATA_SYNC && window.STOCK_DATA_SYNC.get(category)) {
        this.watchlist = [...window.STOCK_DATA_SYNC.get(category)];
        this.saveWatchlist();
        this.renderWatchlist();
      } else if (STOCK_DATA[category]) {
        this.watchlist = [...STOCK_DATA[category]];
        this.saveWatchlist();
        this.renderWatchlist();
      }
    } catch (error) {
      console.error(`Error loading category ${category}:`, error);
      if (STOCK_DATA[category]) {
        this.watchlist = [...STOCK_DATA[category]];
        this.saveWatchlist();
        this.renderWatchlist();
      }
    }
  }

  renderWatchlist() {
    const container = document.getElementById('watchlist');
    if (!container) return;

    container.innerHTML = '';

    if (this.watchlist.length === 0) {
      container.innerHTML = '<li class="empty-state">No stocks in watchlist. Add some stocks!</li>';
      return;
    }

    this.watchlist.forEach(stock => {
      const li = document.createElement('li');
      li.className = 'stock-item';
      li.setAttribute('data-symbol', `${stock.exchange}:${stock.symbol}`);
      li.innerHTML = `
        <div class="stock-info">
          <span class="stock-symbol">${stock.symbol}</span>
          <span class="stock-name">${stock.name}</span>
        </div>
        <button class="remove-stock" data-symbol="${stock.symbol}" title="Remove from watchlist">X</button>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-stock')) return;
        this.selectStock(stock, li);
      });

      const removeBtn = li.querySelector('.remove-stock');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeStock(stock.symbol);
      });

      container.appendChild(li);
    });

    if (this.watchlist.length > 0 && !this.currentStock) {
      const firstItem = container.querySelector('.stock-item');
      if (firstItem) {
        this.selectStock(this.watchlist[0], firstItem);
      }
    }
    
    this.updateBottomTicker();
  }
  
  updateBottomTicker() {
    const tickerContainer = document.querySelector('.horizontal-ticker .tradingview-widget-container__widget');
    if (!tickerContainer || this.watchlist.length === 0) return;
    
    tickerContainer.innerHTML = '';
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    
    const symbols = this.watchlist.map(stock => ({
      proName: `${stock.exchange}:${stock.symbol}`,
      title: stock.symbol
    }));
    
    script.textContent = JSON.stringify({
      symbols: symbols,
      showSymbolLogo: true,
      colorTheme: document.body.classList.contains('light') ? 'light' : 'dark',
      isTransparent: false,
      displayMode: 'adaptive',
      locale: 'en'
    });
    
    tickerContainer.appendChild(script);
  }

  selectStock(stock, element) {
    document.querySelectorAll('.stock-item').forEach(item => {
      item.classList.remove('active');
    });
    if (element) element.classList.add('active');

    this.currentStock = stock;
    const cleanSymbol = this.getCleanSymbolForTradingView(stock.symbol);
    this.loadStockChart(`${stock.exchange}:${cleanSymbol}`, stock.name);
  }
  
  getCleanSymbolForTradingView(symbol) {
    let cleanSymbol = symbol;
    const suffixes = ['.AX', '.TO', '.L', '.T', '.AT', '.HK', '.SS', '.SZ', '.PA', '.DE', '.MI', '.AS', '.SW', '.ST'];
    
    for (const suffix of suffixes) {
      if (cleanSymbol.includes(suffix)) {
        cleanSymbol = cleanSymbol.replace(suffix, '');
        break;
      }
    }
    
    if (cleanSymbol === 'BRK.B') {
      return 'BRK.B';
    }
    
    if (cleanSymbol.includes('.') && !['BRK.B', 'BF.B', 'BF.A'].includes(cleanSymbol)) {
      cleanSymbol = cleanSymbol.split('.')[0];
    }
    
    return cleanSymbol.toUpperCase();
  }

  async loadStockChart(symbol, title) {
    console.log('Loading chart for:', symbol, 'title:', title);
    
    const chartContainer = document.getElementById('chart-container');
    const stockTitle = document.getElementById('stock-title');

    if (!chartContainer || !stockTitle) {
      console.error('Missing chart container or stock title element');
      return;
    }

    // Clear container and show loading
    chartContainer.innerHTML = `
      <div id="chart-placeholder" style="height: 500px; width: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; border: 1px solid #333; border-radius: 8px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <div class="loading-spinner" style="border: 4px solid #333; border-top: 4px solid #2196F3; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
        <h3 style="color: #fff; margin: 20px 0 10px 0;">Loading Chart...</h3>
        <p style="color: #ccc; margin: 0 0 20px 0;">Fetching data for ${symbol}</p>
        <div class="chart-actions" style="display: flex; gap: 10px;">
          <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}" target="_blank" 
             style="color: #2196F3; text-decoration: none; padding: 8px 16px; border: 1px solid #2196F3; border-radius: 4px; transition: all 0.3s;"
             onmouseover="this.style.backgroundColor='#2196F3'; this.style.color='white';"
             onmouseout="this.style.backgroundColor='transparent'; this.style.color='#2196F3';">View on TradingView</a>
          <button onclick="this.parentElement.parentElement.querySelector('.loading-spinner').style.display='none'; this.parentElement.innerHTML='<p style=\"color: #ccc;\">Chart loading disabled</p>';"
                  style="color: #666; background: transparent; border: 1px solid #666; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
      </div>
    `;

    // Add loading animation CSS
    if (!document.querySelector('#loading-style')) {
      const style = document.createElement('style');
      style.id = 'loading-style';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .chart-container {
          background: #0d1421;
          border-radius: 8px;
          padding: 0;
        }
      `;
      document.head.appendChild(style);
    }

    // Try to load real stock data and create a simple chart
    try {
      const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
      await this.loadRealTimeChart(cleanSymbol, chartContainer);
    } catch (error) {
      console.error('Failed to load chart:', error);
      // Show TradingView embedded iframe as fallback
      setTimeout(() => {
        this.loadTradingViewFallback(symbol, chartContainer);
      }, 2000);
    }
    
    // Update the title
    const symbolOnly = symbol.includes(':') ? symbol.split(':')[1] : symbol;
    stockTitle.textContent = `${symbolOnly} - ${title}`;
  }

  async loadRealTimeChart(symbol, container) {
    try {
      console.log('Loading TradingView chart for symbol:', symbol);
      
      // Use TradingView widget directly like on the analysis page
      this.loadTradingViewWidget(symbol, container);
      
    } catch (error) {
      console.error('Error loading chart:', error);
      this.loadTradingViewFallback(symbol, container);
    }
  }

  loadTradingViewWidget(symbol, container) {
    // Determine the proper exchange prefix
    let tradingViewSymbol = symbol;
    if (!symbol.includes(':')) {
      // Add exchange prefix for major exchanges
      if (['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA'].includes(symbol)) {
        tradingViewSymbol = `NASDAQ:${symbol}`;
      } else {
        tradingViewSymbol = `NYSE:${symbol}`;
      }
    }

    console.log('Loading TradingView widget for:', tradingViewSymbol);

    // Create a unique container ID
    const containerId = `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    
    container.innerHTML = `
      <div class="tradingview-widget-container" style="height: 500px; width: 100%;">
        <div id="${containerId}" style="height: 100%; width: 100%;"></div>
      </div>
    `;

    // Load TradingView script if not already loaded
    if (!window.TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.onload = () => {
        this.createTradingViewChart(containerId, tradingViewSymbol);
      };
      document.head.appendChild(script);
    } else {
      this.createTradingViewChart(containerId, tradingViewSymbol);
    }
  }

  createTradingViewChart(containerId, symbol) {
    try {
      new TradingView.widget({
        "width": "100%",
        "height": 500,
        "symbol": symbol,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": document.body.classList.contains('light') ? "light" : "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": document.body.classList.contains('light') ? "#f1f3f6" : "#1e1e1e",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "container_id": containerId,
        "studies": [
          "Volume@tv-basicstudies"
        ],
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650"
      });
      console.log('TradingView widget created successfully for:', symbol);
    } catch (error) {
      console.error('Error creating TradingView widget:', error);
      document.getElementById(containerId).innerHTML = `
        <div style="height: 500px; display: flex; align-items: center; justify-content: center; flex-direction: column; background: #1a1a2e; border-radius: 8px; color: white;">
          <h3>Chart Loading Error</h3>
          <p>Unable to load chart for ${symbol}</p>
          <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}" target="_blank" 
             style="color: #2196F3; text-decoration: none; padding: 10px 20px; border: 1px solid #2196F3; border-radius: 6px; margin-top: 10px;">View on TradingView</a>
        </div>
      `;
    }
  }

  renderQuoteOnly(symbol, quote, container) {
    const currentPrice = quote.c || 0;
    const change = quote.d || 0;
    const changePercent = quote.dp || 0;
    const high = quote.h || 0;
    const low = quote.l || 0;
    const open = quote.o || 0;
    const prevClose = quote.pc || 0;

    const isPositive = change >= 0;
    const color = isPositive ? '#4caf50' : '#f44336';
    const bgColor = isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';

    container.innerHTML = `
      <div style="height: 500px; width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; padding: 20px; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">${symbol}</h2>
            <div style="font-size: 36px; font-weight: 700; margin: 10px 0; color: ${color};">
              $${currentPrice.toFixed(2)}
            </div>
            <div style="font-size: 16px; color: ${color};">
              ${isPositive ? '+' : ''}$${change.toFixed(2)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)
            </div>
          </div>
          <div style="text-align: right; font-size: 14px; color: #ccc;">
            <div>High: <span style="color: #4caf50;">$${high.toFixed(2)}</span></div>
            <div>Low: <span style="color: #f44336;">$${low.toFixed(2)}</span></div>
            <div>Open: <span style="color: #fff;">$${open.toFixed(2)}</span></div>
            <div>Prev Close: <span style="color: #ccc;">$${prevClose.toFixed(2)}</span></div>
          </div>
        </div>
        
        <div style="background: ${bgColor}; border-radius: 12px; padding: 40px; height: 300px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <div style="font-size: 18px; color: #999; margin-bottom: 20px;">📊</div>
          <div style="font-size: 16px; color: #ccc; text-align: center; line-height: 1.6;">
            <div>Real-time price data available</div>
            <div style="margin-top: 10px; font-size: 14px; color: #999;">Historical chart data not available for this symbol</div>
          </div>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}" target="_blank" 
             style="color: #2196F3; text-decoration: none; padding: 10px 20px; border: 1px solid #2196F3; border-radius: 6px; font-weight: 500; transition: all 0.3s;"
             onmouseover="this.style.backgroundColor='#2196F3'; this.style.color='white';"
             onmouseout="this.style.backgroundColor='transparent'; this.style.color='#2196F3';">View Chart on TradingView</a>
          <button onclick="location.reload()" 
                  style="color: #ccc; background: transparent; border: 1px solid #555; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Refresh Data</button>
        </div>
      </div>
    `;
  }

  renderStockChart(symbol, quote, candles, container) {
    const currentPrice = quote.c || 0;
    const change = quote.d || 0;
    const changePercent = quote.dp || 0;
    const high = quote.h || 0;
    const low = quote.l || 0;
    const open = quote.o || 0;
    const prevClose = quote.pc || 0;

    // Create price points for simple line chart
    const prices = candles.c || [];
    const timestamps = candles.t || [];
    
    // Generate SVG path for price line
    const width = 100;
    const height = 60;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    let pathData = '';
    prices.forEach((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - minPrice) / priceRange) * height;
      pathData += index === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });

    const isPositive = change >= 0;
    const color = isPositive ? '#4caf50' : '#f44336';
    const bgColor = isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';

    container.innerHTML = `
      <div style="height: 500px; width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; padding: 20px; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">${symbol}</h2>
            <div style="font-size: 36px; font-weight: 700; margin: 10px 0; color: ${color};">
              $${currentPrice.toFixed(2)}
            </div>
            <div style="font-size: 16px; color: ${color};">
              ${isPositive ? '+' : ''}$${change.toFixed(2)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)
            </div>
          </div>
          <div style="text-align: right; font-size: 14px; color: #ccc;">
            <div>High: <span style="color: #4caf50;">$${high.toFixed(2)}</span></div>
            <div>Low: <span style="color: #f44336;">$${low.toFixed(2)}</span></div>
            <div>Open: <span style="color: #fff;">$${open.toFixed(2)}</span></div>
            <div>Prev Close: <span style="color: #ccc;">$${prevClose.toFixed(2)}</span></div>
          </div>
        </div>
        
        <div style="background: ${bgColor}; border-radius: 12px; padding: 20px; height: 300px; position: relative; overflow: hidden;">
          <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px;">
            <defs>
              <linearGradient id="gradient-${symbol}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.6" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.1" />
              </linearGradient>
            </defs>
            <path d="${pathData}" stroke="${color}" stroke-width="2" fill="none"/>
            <path d="${pathData} L${width},${height} L0,${height} Z" fill="url(#gradient-${symbol})"/>
          </svg>
          <div style="position: absolute; bottom: 10px; left: 20px; right: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #999;">
            <span>7 days ago</span>
            <span>Today</span>
          </div>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}" target="_blank" 
             style="color: #2196F3; text-decoration: none; padding: 10px 20px; border: 1px solid #2196F3; border-radius: 6px; font-weight: 500; transition: all 0.3s;"
             onmouseover="this.style.backgroundColor='#2196F3'; this.style.color='white';"
             onmouseout="this.style.backgroundColor='transparent'; this.style.color='#2196F3';">Advanced Chart</a>
          <button onclick="location.reload()" 
                  style="color: #ccc; background: transparent; border: 1px solid #555; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Refresh</button>
        </div>
      </div>
    `;
  }

  loadTradingViewFallback(symbol, container) {
    container.innerHTML = `
      <div style="height: 500px; width: 100%; border: 0; border-radius: 8px; overflow: hidden;">
        <iframe src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(symbol)}&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${encodeURIComponent(symbol)}"
                style="width: 100%; height: 100%; border: 0; border-radius: 8px;"
                frameborder="0" allowtransparency="true" scrolling="no" allowfullscreen="true">
        </iframe>
      </div>
    `;
  }
}

class StockSearch {
  constructor(watchlistManager) {
    this.watchlistManager = watchlistManager;
    this.setupSearch();
  }

  setupSearch() {
    const input = document.getElementById('stockSearch');
    const suggestions = document.getElementById('searchSuggestions');
    const errorBox = document.getElementById('searchError');

    if (!input) return;

    let searchTimeout;

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(searchTimeout);
      
      if (query.length < 2) {
        suggestions.classList.remove('show');
        return;
      }

      searchTimeout = setTimeout(() => {
        this.searchStocks(query, suggestions, errorBox);
      }, 300);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const firstSuggestion = suggestions.querySelector('.suggestion-item');
        if (firstSuggestion) {
          firstSuggestion.click();
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.classList.remove('show');
      }
    });
  }

  async searchStocks(query, suggestions, errorBox) {
    try {
      errorBox.textContent = '';
      suggestions.innerHTML = '<div class="suggestion-item">Searching...</div>';
      suggestions.classList.add('show');
      
      const apiKey = window.FINNHUB_API_KEY || 'd0of8thr01qsib2c9up0d0of8thr01qsib2c9upg';
      const apiUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      let apiResults = [];
      
      if (data.count > 0 && data.result) {
        const validResults = await Promise.all(
          data.result
            .filter(stock => {
              const isValidType = stock.type === 'Common Stock' || stock.type === 'ETP';
              const hasSymbol = stock.symbol && stock.symbol.trim() !== '';
              return isValidType && hasSymbol;
            })
            .slice(0, 12)
            .map(async (stock) => {
              const isCompatible = await this.validateTradingViewCompatibility(stock.symbol);
              if (isCompatible) {
                return {
                  symbol: stock.symbol,
                  name: stock.description || stock.displaySymbol || stock.symbol,
                  exchange: this.determineExchange(stock.symbol),
                  source: 'api'
                };
              }
              return null;
            })
        );
        
        apiResults = validResults.filter(result => result !== null).slice(0, 8);
      }
      
      const localResults = this.searchLocalStocks(query).slice(0, 3);
      const allResults = [...apiResults, ...localResults.filter(local => 
        !apiResults.some(api => api.symbol === local.symbol)
      )];
      
      if (allResults.length > 0) {
        this.showSuggestions(allResults, suggestions);
      } else {
        const cleanQuery = query.toUpperCase().replace(/[^A-Z]/g, '');
        if (cleanQuery.length >= 1 && cleanQuery.length <= 5 && this.looksLikeUSStock(cleanQuery)) {
          const directSymbol = {
            symbol: cleanQuery,
            name: `${cleanQuery} (US Stock)`,
            exchange: this.determineExchange(cleanQuery),
            source: 'direct'
          };
          this.showSuggestions([directSymbol], suggestions);
        } else {
          suggestions.innerHTML = '<div class="suggestion-item">No compatible stocks found</div>';
        }
      }
    } catch (error) {
      console.error('Search API error:', error);
      const localResults = this.searchLocalStocks(query);
      
      if (localResults.length > 0) {
        this.showSuggestions(localResults, suggestions);
        errorBox.textContent = 'API offline - showing local matches';
      } else {
        suggestions.innerHTML = '<div class="suggestion-item">Search unavailable</div>';
        errorBox.textContent = `Search error: ${error.message}`;
      }
    }
  }

  searchLocalStocks(query) {
    const allStocks = [];
    Object.values(STOCK_DATA).forEach(category => {
      allStocks.push(...category);
    });

    const uniqueStocks = allStocks.filter((stock, index, self) => 
      index === self.findIndex(s => s.symbol === stock.symbol)
    );

    return uniqueStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }

  determineExchange(symbol) {
    const nasdaqSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
      'ADBE', 'PYPL', 'INTC', 'CMCSA', 'COST', 'PEP', 'AVGO', 'TXN', 'QCOM',
      'SBUX', 'GILD', 'INTU', 'AMD', 'BKNG', 'ADP', 'MDLZ', 'ISRG', 'VRTX', 'MU'
    ];
    
    const cryptoSymbols = ['BTC', 'ETH', 'LTC', 'XRP', 'ADA', 'DOT', 'LINK', 'BCH'];
    if (cryptoSymbols.some(crypto => symbol.includes(crypto))) {
      return 'CRYPTO';
    }
    
    if (symbol.includes('.AX') || symbol.endsWith('.AX')) return 'ASX';
    if (symbol.includes('.TO') || symbol.endsWith('.TO')) return 'TSX';
    if (symbol.includes('.L') || symbol.endsWith('.L')) return 'LSE';
    if (symbol.includes('.T') || symbol.endsWith('.T')) return 'TSE';
    if (symbol.includes('.AT') || symbol.endsWith('.AT')) return 'ATHEX';
    
    return nasdaqSymbols.includes(symbol.replace(/[^A-Z]/g, '')) ? 'NASDAQ' : 'NYSE';
  }

  showSuggestions(results, suggestions) {
    suggestions.innerHTML = '';
    
    results.forEach(stock => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <div class="suggestion-symbol">${stock.symbol}</div>
        <div class="suggestion-name">${stock.name}</div>
      `;
      
      item.addEventListener('click', () => {
        this.selectStock(stock);
        suggestions.classList.remove('show');
        document.getElementById('stockSearch').value = '';
      });
      
      suggestions.appendChild(item);
    });
    
    suggestions.classList.add('show');
  }

  selectStock(stock) {
    const added = this.watchlistManager.addStock(stock);
    this.watchlistManager.selectStock(stock, null);
    
    if (window.NotificationManager) {
      window.NotificationManager.show(`Loading ${stock.symbol} chart...`, 'info', 2000);
    }
  }
  
  async validateTradingViewCompatibility(symbol) {
    try {
      if (this.isUSStock(symbol)) return true;
      if (this.isMajorInternationalStock(symbol)) return true;
      
      const apiKey = window.FINNHUB_API_KEY || 'd0of8thr01qsib2c9up0d0of8thr01qsib2c9upg';
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
        { timeout: 1500 }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.c && data.c > 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  
  isUSStock(symbol) {
    const cleanSymbol = symbol.replace(/\.(AX|TO|L|T|AT|HK|SS|SZ|PA|DE|MI|AS|SW|ST)$/, '');
    if (!/^[A-Z]{1,5}$/.test(cleanSymbol)) return false;
    
    const majorUSSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
      'ADBE', 'PYPL', 'INTC', 'CMCSA', 'COST', 'PEP', 'AVGO', 'TXN', 'QCOM',
      'SBUX', 'GILD', 'INTU', 'AMD', 'BKNG', 'ADP', 'MDLZ', 'ISRG', 'VRTX',
      'MU', 'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'KO', 'PG', 'JNJ', 'PFE',
      'MRK', 'XOM', 'CVX', 'WMT', 'HD', 'DIS', 'NKE', 'MCD', 'V', 'MA'
    ];
    
    if (majorUSSymbols.includes(cleanSymbol)) return true;
    return true;
  }
  
  isMajorInternationalStock(symbol) {
    const majorPatterns = [
      /^[A-Z]{2,5}\.AX$/,
      /^[A-Z]{1,4}\.TO$/,
      /^[A-Z]{1,4}\.L$/,
      /^\d{4,6}\.(HK|T)$/,
      /^[A-Z]{1,4}\.(PA|DE|MI|AS|SW)$/
    ];
    
    return majorPatterns.some(pattern => pattern.test(symbol));
  }
  
  looksLikeUSStock(symbol) {
    return /^[A-Z]{1,5}$/.test(symbol);
  }
}

function applyTheme() {
  const switcher = document.getElementById('themeSwitch');
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'light') {
    document.body.classList.add('light');
    if (switcher) switcher.checked = true;
  }

  if (switcher) {
    switcher.addEventListener('change', () => {
      if (switcher.checked) {
        document.body.classList.add('light');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light');
        localStorage.setItem('theme', 'dark');
      }
      
      if (window.watchlistManager && window.watchlistManager.currentStock) {
        setTimeout(() => {
          const stock = window.watchlistManager.currentStock;
          window.watchlistManager.loadStockChart(`${stock.exchange}:${stock.symbol}`, stock.name);
        }, 100);
      }
    });
  }
}

function revealOnScroll() {
  document.querySelectorAll('.fade').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      el.classList.add('visible');
    }
  });
}

function calculateROI() {
  const investment = parseFloat(document.getElementById('investment')?.value);
  const months = parseFloat(document.getElementById('months')?.value);
  const avgMonthlyROI = 0.0135;

  if (isNaN(investment) || isNaN(months)) return;

  const predictedAmount = investment * Math.pow(1 + avgMonthlyROI, months);
  const roi = ((predictedAmount - investment) / investment) * 100;

  const resultElement = document.getElementById('roiResult');
  if (resultElement) {
    resultElement.textContent = 
      `Predicted ROI: ${roi.toFixed(2)}%\nValue after ${months} months: $${predictedAmount.toFixed(2)}`;
  }
}

async function fetchStockPrice(symbol) {
  const apiKey = window.FINNHUB_API_KEY || 'd0of8thr01qsib2c9up0d0of8thr01qsib2c9upg';
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch price for ${symbol}`);
  }
  return await response.json();
}

class MarketIndicators {
  constructor() {
    this.indicators = ['SPY', 'VIX'];
    this.updateInterval = 30000;
    this.init();
  }

  async init() {
    await this.updateIndicators();
    setInterval(() => this.updateIndicators(), this.updateInterval);
  }

  async updateIndicators() {
    for (const symbol of this.indicators) {
      try {
        const data = await this.fetchStockData(symbol);
        this.updateIndicatorDisplay(symbol, data);
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
      }
    }
  }

  async fetchStockData(symbol) {
    const apiKey = window.FINNHUB_API_KEY || 'd0of8thr01qsib2c9up0d0of8thr01qsib2c9upg';
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    );
    return await response.json();
  }

  updateIndicatorDisplay(symbol, data) {
    const elementId = symbol.toLowerCase() + 'Indicator';
    const element = document.getElementById(elementId);
    if (!element) return;

    const valueElement = element.querySelector('.indicator-value');
    const change = data.dp || 0;
    const price = data.c || 0;
    
    valueElement.textContent = `$${price.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`;
    valueElement.className = 'indicator-value ' + (change >= 0 ? 'positive' : 'negative');
  }
}

class NotificationManager {
  static show(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, duration);
  }
}

class WeatherWidget {
  constructor() {
    this.weatherApiKey = '2dadd0fc07f34bb18b1211642252008'; // WeatherAPI.com API key
    this.container = document.getElementById('weather-widget');
    this.init();
  }

  async init() {
    if (!this.container) return;
    
    try {
      // Get user's location
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      // Get weather data from WeatherAPI.com
      const weatherData = await this.fetchWeatherData(latitude, longitude);
      
      // Render weather widget
      this.renderWeather(weatherData);
      
      // Update time every second
      this.startClock();
      
    } catch (error) {
      console.error('Weather widget error:', error);
      this.showError(error.message);
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location access denied by user'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information unavailable'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out'));
              break;
            default:
              reject(new Error('Unknown location error'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async fetchWeatherData(lat, lon) {
    const url = `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=${lat},${lon}&aqi=yes`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`WeatherAPI error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // Fallback to mock data if API fails
      console.warn('Weather API failed, using mock data:', error);
      return this.getMockWeatherData();
    }
  }

  getMockWeatherData() {
    return {
      location: {
        name: 'Sample City',
        region: 'Sample State',
        country: 'Sample Country',
        localtime: new Date().toISOString().replace('T', ' ').substring(0, 16)
      },
      current: {
        temp_c: 22,
        temp_f: 72,
        condition: {
          text: 'Clear sky',
          icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
          code: 1000
        },
        wind_kph: 12.6,
        wind_dir: 'NW',
        pressure_mb: 1013.0,
        humidity: 65,
        cloud: 20,
        feelslike_c: 24,
        feelslike_f: 75,
        vis_km: 10.0,
        uv: 5.0
      }
    };
  }

  getWeatherIcon(conditionCode, conditionText) {
    // WeatherAPI.com condition codes mapping to emojis
    const iconMap = {
      1000: '☀️', // Sunny
      1003: '🌤️', // Partly cloudy
      1006: '☁️', // Cloudy
      1009: '☁️', // Overcast
      1030: '🌫️', // Mist
      1063: '🌦️', // Patchy rain possible
      1066: '🌨️', // Patchy snow possible
      1069: '🌨️', // Patchy sleet possible
      1072: '🌨️', // Patchy freezing drizzle possible
      1087: '⛈️', // Thundery outbreaks possible
      1114: '❄️', // Blowing snow
      1117: '❄️', // Blizzard
      1135: '🌫️', // Fog
      1147: '🌫️', // Freezing fog
      1150: '🌦️', // Patchy light drizzle
      1153: '🌦️', // Light drizzle
      1168: '🌦️', // Freezing drizzle
      1171: '🌦️', // Heavy freezing drizzle
      1180: '🌦️', // Patchy light rain
      1183: '🌧️', // Light rain
      1186: '🌦️', // Moderate rain at times
      1189: '🌧️', // Moderate rain
      1192: '🌧️', // Heavy rain at times
      1195: '🌧️', // Heavy rain
      1198: '🌧️', // Light freezing rain
      1201: '🌧️', // Moderate or heavy freezing rain
      1204: '🌨️', // Light sleet
      1207: '🌨️', // Moderate or heavy sleet
      1210: '🌨️', // Patchy light snow
      1213: '❄️', // Light snow
      1216: '🌨️', // Patchy moderate snow
      1219: '❄️', // Moderate snow
      1222: '❄️', // Patchy heavy snow
      1225: '❄️', // Heavy snow
      1237: '🧊', // Ice pellets
      1240: '🌦️', // Light rain shower
      1243: '🌧️', // Moderate or heavy rain shower
      1246: '🌧️', // Torrential rain shower
      1249: '🌨️', // Light sleet showers
      1252: '🌨️', // Moderate or heavy sleet showers
      1255: '🌨️', // Light snow showers
      1258: '❄️', // Moderate or heavy snow showers
      1261: '🧊', // Light showers of ice pellets
      1264: '🧊', // Moderate or heavy showers of ice pellets
      1273: '⛈️', // Patchy light rain with thunder
      1276: '⛈️', // Moderate or heavy rain with thunder
      1279: '⛈️', // Patchy light snow with thunder
      1282: '⛈️'  // Moderate or heavy snow with thunder
    };
    
    return iconMap[conditionCode] || this.getIconByText(conditionText);
  }

  getIconByText(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('sunny') || lowerText.includes('clear')) return '☀️';
    if (lowerText.includes('thunder')) return '⛈️';
    if (lowerText.includes('rain')) return '🌧️';
    if (lowerText.includes('snow')) return '❄️';
    if (lowerText.includes('cloud')) return '☁️';
    if (lowerText.includes('mist') || lowerText.includes('fog')) return '🌫️';
    return '🌤️';
  }

  renderWeather(weatherData) {
    const temp = Math.round(weatherData.current.temp_c);
    const feelsLike = Math.round(weatherData.current.feelslike_c);
    const description = weatherData.current.condition.text;
    const icon = this.getWeatherIcon(weatherData.current.condition.code, description);
    const humidity = weatherData.current.humidity;
    const pressure = Math.round(weatherData.current.pressure_mb);
    const windSpeed = Math.round(weatherData.current.wind_kph);
    const visibility = weatherData.current.vis_km;
    const uvIndex = weatherData.current.uv;
    
    // Format location string from WeatherAPI data
    let locationString = weatherData.location.name;
    if (weatherData.location.region && weatherData.location.country) {
      locationString = `${weatherData.location.name}, ${weatherData.location.region}, ${weatherData.location.country}`;
    } else if (weatherData.location.country) {
      locationString = `${weatherData.location.name}, ${weatherData.location.country}`;
    }

    this.container.innerHTML = `
      <div class="weather-content">
        <div class="weather-header">
          <div class="weather-main-info">
            <div class="weather-icon-large">${icon}</div>
            <div class="weather-temp-section">
              <div class="weather-temp">${temp}°</div>
              <div class="weather-desc">${description}</div>
              <div class="weather-location">📍 ${locationString}</div>
            </div>
          </div>
          
          <div class="weather-time-section">
            <div class="time-display">
              <div class="current-time" id="current-time"></div>
              <div class="current-date" id="current-date"></div>
            </div>
          </div>
        </div>
        
        <div class="weather-stats">
          <div class="weather-stat">
            <div class="stat-icon">🌡️</div>
            <div class="stat-info">
              <div class="stat-label">Feels Like</div>
              <div class="stat-value">${feelsLike}°C</div>
            </div>
          </div>
          
          <div class="weather-stat">
            <div class="stat-icon">💧</div>
            <div class="stat-info">
              <div class="stat-label">Humidity</div>
              <div class="stat-value">${humidity}%</div>
            </div>
          </div>
          
          <div class="weather-stat">
            <div class="stat-icon">🌬️</div>
            <div class="stat-info">
              <div class="stat-label">Wind</div>
              <div class="stat-value">${windSpeed} km/h</div>
            </div>
          </div>
          
          <div class="weather-stat">
            <div class="stat-icon">👁️</div>
            <div class="stat-info">
              <div class="stat-label">Visibility</div>
              <div class="stat-value">${visibility} km</div>
            </div>
          </div>
          
          <div class="weather-stat">
            <div class="stat-icon">☀️</div>
            <div class="stat-info">
              <div class="stat-label">UV Index</div>
              <div class="stat-value">${uvIndex}</div>
            </div>
          </div>
          
          <div class="weather-stat">
            <div class="stat-icon">🌡️</div>
            <div class="stat-info">
              <div class="stat-label">Pressure</div>
              <div class="stat-value">${pressure} mb</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      const timeElement = document.getElementById('current-time');
      const dateElement = document.getElementById('current-date');
      
      if (timeElement && dateElement) {
        timeElement.textContent = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        dateElement.textContent = now.toLocaleDateString([], {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    };
    
    updateTime(); // Initial update
    setInterval(updateTime, 1000); // Update every second
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="weather-content">
        <div class="weather-header">
          <div class="weather-main-info">
            <div class="weather-icon-large">🌐</div>
            <div class="weather-temp-section">
              <div class="weather-temp">--°</div>
              <div class="weather-desc">Weather Unavailable</div>
              <div class="weather-location">⚠️ ${message}</div>
            </div>
          </div>
          
          <div class="weather-time-section">
            <div class="time-display">
              <div class="current-time" id="current-time"></div>
              <div class="current-date" id="current-date"></div>
            </div>
          </div>
        </div>
        
        <div class="weather-stats">
          <div class="weather-stat disabled">
            <div class="stat-icon">🌡️</div>
            <div class="stat-info">
              <div class="stat-label">Feels Like</div>
              <div class="stat-value">--°</div>
            </div>
          </div>
          
          <div class="weather-stat disabled">
            <div class="stat-icon">💧</div>
            <div class="stat-info">
              <div class="stat-label">Humidity</div>
              <div class="stat-value">--%</div>
            </div>
          </div>
          
          <div class="weather-stat disabled">
            <div class="stat-icon">🌬️</div>
            <div class="stat-info">
              <div class="stat-label">Wind</div>
              <div class="stat-value">-- km/h</div>
            </div>
          </div>
          
          <div class="weather-stat disabled">
            <div class="stat-icon">👁️</div>
            <div class="stat-info">
              <div class="stat-label">Visibility</div>
              <div class="stat-value">-- km</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Still show the clock even if weather fails
    this.startClock();
  }
}

class EnhancedFeatures {
  constructor(watchlistManager) {
    this.watchlistManager = watchlistManager;
    this.favorites = this.loadFavorites();
    this.setupKeyboardShortcuts();
    this.setupMobileMenu();
  }

  loadFavorites() {
    const saved = localStorage.getItem('stockFavorites');
    return saved ? JSON.parse(saved) : [];
  }

  saveFavorites() {
    localStorage.setItem('stockFavorites', JSON.stringify(this.favorites));
  }

  toggleFavorite(symbol) {
    const index = this.favorites.indexOf(symbol);
    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(symbol);
    }
    this.saveFavorites();
    this.watchlistManager.renderWatchlist();
  }

  isFavorite(symbol) {
    return this.favorites.includes(symbol);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('stockSearch')?.focus();
      }
      
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('stockSearch');
        if (searchInput) {
          searchInput.value = '';
          searchInput.blur();
        }
        document.getElementById('searchSuggestions')?.classList.remove('show');
      }
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        this.navigateStocks(e.key === 'ArrowDown');
      }
    });
  }

  navigateStocks(down = true) {
    const stockItems = document.querySelectorAll('.stock-item');
    const activeItem = document.querySelector('.stock-item.active');
    
    if (stockItems.length === 0) return;
    
    let newIndex = 0;
    if (activeItem) {
      const currentIndex = Array.from(stockItems).indexOf(activeItem);
      newIndex = down 
        ? Math.min(currentIndex + 1, stockItems.length - 1)
        : Math.max(currentIndex - 1, 0);
    }
    
    stockItems[newIndex]?.click();
  }

  setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebarMenu = document.getElementById('sidebarMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuClose = document.getElementById('menuClose');
    
    if (menuToggle && sidebarMenu) {
      menuToggle.addEventListener('click', () => {
        sidebarMenu.classList.add('open');
        menuOverlay.classList.add('show');
        menuToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
      
      const closeMenu = () => {
        sidebarMenu.classList.remove('open');
        menuOverlay.classList.remove('show');
        menuToggle.classList.remove('active');
        document.body.style.overflow = '';
      };
      
      if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
      }
      
      if (menuClose) {
        menuClose.addEventListener('click', closeMenu);
      }
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebarMenu.classList.contains('open')) {
          closeMenu();
        }
      });
      
      this.setupMenuActions(closeMenu);
    }
  }
  
  setupMenuActions(closeMenu) {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        const value = item.getAttribute('data-value');
        
        this.executeMenuAction(action, value);
        closeMenu();
      });
    });
  }
  
  executeMenuAction(action, value) {
    switch (action) {
      case 'market':
        this.handleMarketAction(value);
        break;
      case 'randomStock':
        this.selectRandomStock();
        break;
      case 'topMovers':
        this.showTopMovers();
        break;
      case 'resetWatchlist':
        this.resetToDefault();
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case 'share':
        this.shareWatchlist();
        break;
      case 'feedback':
        this.openFeedback();
        break;
      case 'shortcuts':
        this.showShortcuts();
        break;
      case 'about':
        this.showAbout();
        break;
      case 'goToDashboard':
        window.location.href = 'stocks.html';
        break;
      case 'refreshData':
        location.reload();
        break;
      case 'compareStocks':
        this.openStockComparison();
        break;
    }
  }
  
  openStockComparison() {
    const compareUrl = 'https://www.tradingview.com/chart/?symbol=NASDAQ%3AAAPL';
    window.open(compareUrl, '_blank');
    NotificationManager.show('Opening stock comparison tool...', 'info');
  }
  
  handleMarketAction(market) {
    switch (market) {
      case 'US':
        window.watchlistManager.loadCategory('sp500');
        NotificationManager.show('Loaded US Market stocks', 'success');
        break;
      case 'CA':
        window.watchlistManager.loadCategory('tsx');
        NotificationManager.show('Loaded Canadian Market stocks', 'success');
        break;
      case 'EU':
        NotificationManager.show('European markets coming soon!', 'info');
        break;
    }
  }
  
  selectRandomStock() {
    const allStocks = [];
    Object.values(STOCK_DATA).forEach(category => {
      allStocks.push(...category);
    });
    
    const randomStock = allStocks[Math.floor(Math.random() * allStocks.length)];
    window.watchlistManager.addStock(randomStock);
    window.watchlistManager.selectStock(randomStock, null);
    NotificationManager.show(`Random pick: ${randomStock.symbol}`, 'success');
  }
  
  showTopMovers() {
    const topMovers = [
      { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
      { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
      { symbol: "AMD", name: "Advanced Micro Devices Inc.", exchange: "NASDAQ" },
      { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
      { symbol: "GOOGL", name: "Alphabet Inc. Class A", exchange: "NASDAQ" }
    ];
    
    window.watchlistManager.watchlist = topMovers;
    window.watchlistManager.saveWatchlist();
    window.watchlistManager.renderWatchlist();
    NotificationManager.show('Loaded top movers!', 'success');
  }
  
  resetToDefault() {
    window.watchlistManager.watchlist = [...DEFAULT_WATCHLIST];
    window.watchlistManager.saveWatchlist();
    window.watchlistManager.renderWatchlist();
    NotificationManager.show('Reset to default watchlist', 'success');
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        NotificationManager.show('Entered fullscreen mode', 'success');
      }).catch(() => {
        NotificationManager.show('Fullscreen not supported', 'warning');
      });
    } else {
      document.exitFullscreen().then(() => {
        NotificationManager.show('Exited fullscreen mode', 'info');
      });
    }
  }
  
  shareWatchlist() {
    const watchlist = window.watchlistManager.watchlist;
    const symbols = watchlist.map(stock => stock.symbol).join(', ');
    const text = `Check out my stock watchlist: ${symbols} - Track stocks at ${window.location.href}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Stock Watchlist',
        text: text,
        url: window.location.href
      }).then(() => {
        NotificationManager.show('Watchlist shared!', 'success');
      }).catch(() => {
        this.fallbackShare(text);
      });
    } else {
      this.fallbackShare(text);
    }
  }
  
  fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => {
      NotificationManager.show('Watchlist copied to clipboard!', 'success');
    }).catch(() => {
      NotificationManager.show('Sharing not available', 'warning');
    });
  }
  
  openFeedback() {
    const email = 'feedback@stockdashboard.com';
    const subject = 'Stock Dashboard Feedback';
    const body = 'Hi! I\'d like to share some feedback about the Stock Dashboard:\n\n';
    
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    NotificationManager.show('Opening email client...', 'info');
  }
  
  showShortcuts() {
    const shortcuts = [
      'Ctrl/Cmd + F - Focus search',
      'Escape - Close menus/search',
      'Arrow Keys - Navigate stocks',
      'Enter - Select suggestion'
    ];
    
    alert('Keyboard Shortcuts:\n\n' + shortcuts.join('\n'));
  }
  
  showAbout() {
    const about = `Stock Dashboard v2.0\n\nA comprehensive stock tracking application with:\n• Real-time charts and data\n• Multiple market categories\n• Dynamic watchlists\n• Global market support\n\nBuilt with love by Harshil`;
    
    alert(about);
  }
}

function initializeStocksDashboard() {
  if (window.dynamicStockDataManager) {
    if (!window.dynamicStockDataManager.isCacheValid()) {
      window.dynamicStockDataManager.refreshAllData().catch(error => {
        console.error('Background refresh failed:', error);
      });
    }
  }
  
  window.watchlistManager = new WatchlistManager();
  window.stockSearch = new StockSearch(window.watchlistManager);
  window.marketIndicators = new MarketIndicators();
  window.enhancedFeatures = new EnhancedFeatures(window.watchlistManager);
  window.weatherWidget = new WeatherWidget();
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category');
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.watchlistManager.loadCategory(category);
      NotificationManager.show(`Loaded ${category.toUpperCase()} stocks`, 'success');
    });
  });
  
  const addBtn = document.getElementById('addToWatchlistBtn');
  const clearBtn = document.getElementById('clearWatchlist');
  const exportBtn = document.getElementById('exportWatchlist');
  
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (window.watchlistManager.currentStock) {
        const added = window.watchlistManager.addStock(window.watchlistManager.currentStock);
        if (added) {
          addBtn.textContent = 'Added';
          setTimeout(() => addBtn.textContent = '+', 1000);
          NotificationManager.show(`Added ${window.watchlistManager.currentStock.symbol} to watchlist`, 'success');
        } else {
          NotificationManager.show(`${window.watchlistManager.currentStock.symbol} is already in watchlist`, 'warning');
        }
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all stocks from your watchlist?')) {
        const count = window.watchlistManager.watchlist.length;
        window.watchlistManager.clearWatchlist();
        NotificationManager.show(`Cleared ${count} stocks from watchlist`, 'success');
      }
    });
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const watchlist = window.watchlistManager.watchlist;
      if (watchlist.length === 0) {
        NotificationManager.show('No stocks to export', 'warning');
        return;
      }
      
      NotificationManager.show('Fetching current prices...', 'info');
      
      const stocksWithPrices = await Promise.all(
        watchlist.map(async (stock) => {
          try {
            const priceData = await fetchStockPrice(stock.symbol);
            const currentPrice = priceData.c || 'N/A';
            const change = priceData.dp || 0;
            const changeText = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
            
            return {
              ...stock,
              price: currentPrice !== 'N/A' ? `$${currentPrice.toFixed(2)}` : 'N/A',
              change: changeText,
              rawPrice: currentPrice
            };
          } catch (error) {
            console.error(`Error fetching price for ${stock.symbol}:`, error);
            return {
              ...stock,
              price: 'N/A',
              change: 'N/A',
              rawPrice: 'N/A'
            };
          }
        })
      );
      
      const csvContent = 'Symbol,Name,Exchange,Current Price,Change\n' + 
        stocksWithPrices.map(stock => 
          `${stock.symbol},"${stock.name}",${stock.exchange},"${stock.price}","${stock.change}"`
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-watchlist-with-prices.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      NotificationManager.show(`Exported ${watchlist.length} stocks with current prices`, 'success');
    });
  }
  
  window.watchlistManager.renderWatchlist();
  window.watchlistManager.updateBottomTicker();
  setTimeout(() => {
    NotificationManager.show('Welcome to your Stock Dashboard!', 'info');
  }, 1000);
}

window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  revealOnScroll();
  
  if (document.getElementById('watchlist')) {
    initializeStocksDashboard();
  }
});

window.addEventListener('scroll', revealOnScroll);
