// ============ WATCHLIST MANAGEMENT ============
class WatchlistManager {
  constructor() {
    this.watchlist = this.loadWatchlist();
    this.currentStock = null;
    this.searchTimeout = null;
  }

  // Load watchlist from localStorage or use default
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

  // Save watchlist to localStorage
  saveWatchlist() {
    localStorage.setItem('stockWatchlist', JSON.stringify(this.watchlist));
  }

  // Add stock to watchlist
  addStock(stock) {
    if (!this.watchlist.find(s => s.symbol === stock.symbol)) {
      this.watchlist.push(stock);
      this.saveWatchlist();
      this.renderWatchlist();
      return true;
    }
    return false;
  }

  // Remove stock from watchlist
  removeStock(symbol) {
    this.watchlist = this.watchlist.filter(s => s.symbol !== symbol);
    this.saveWatchlist();
    this.renderWatchlist();
  }

  // Clear all stocks
  clearWatchlist() {
    this.watchlist = [];
    this.saveWatchlist();
    this.renderWatchlist();
  }

  // Load category stocks
  loadCategory(category) {
    if (STOCK_DATA[category]) {
      this.watchlist = [...STOCK_DATA[category]];
      this.saveWatchlist();
      this.renderWatchlist();
    }
  }

  // Render watchlist in sidebar
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
        <button class="remove-stock" data-symbol="${stock.symbol}" title="Remove from watchlist">×</button>
      `;

      // Add click handler for stock selection
      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-stock')) return;
        this.selectStock(stock, li);
      });

      // Add remove button handler
      const removeBtn = li.querySelector('.remove-stock');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeStock(stock.symbol);
      });

      container.appendChild(li);
    });

    // Auto-select first stock if none selected
    if (this.watchlist.length > 0 && !this.currentStock) {
      const firstItem = container.querySelector('.stock-item');
      if (firstItem) {
        this.selectStock(this.watchlist[0], firstItem);
      }
    }
    
    // Update bottom ticker
    this.updateBottomTicker();
  }
  
  // Update the bottom ticker with current watchlist
  updateBottomTicker() {
    const tickerContainer = document.querySelector('.horizontal-ticker .tradingview-widget-container__widget');
    if (!tickerContainer || this.watchlist.length === 0) return;
    
    // Clear existing ticker
    tickerContainer.innerHTML = '';
    
    // Create new ticker script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    
    const symbols = this.watchlist.map(stock => ({
      proName: `${stock.exchange}:${stock.symbol}`,
      title: stock.symbol
    }));
    
    script.innerHTML = JSON.stringify({
      symbols: symbols,
      showSymbolLogo: true,
      colorTheme: document.body.classList.contains('light') ? 'light' : 'dark',
      isTransparent: false,
      displayMode: 'adaptive',
      locale: 'en'
    });
    
    tickerContainer.appendChild(script);
  }

  // Select and display stock
  selectStock(stock, element) {
    // Update active state
    document.querySelectorAll('.stock-item').forEach(item => {
      item.classList.remove('active');
    });
    if (element) element.classList.add('active');

    this.currentStock = stock;
    this.loadStockChart(`${stock.exchange}:${stock.symbol}`, stock.name);
  }

  // Load TradingView chart
  loadStockChart(symbol, title) {
    const chartContainer = document.getElementById('chart-container');
    const stockTitle = document.getElementById('stock-title');

    if (!chartContainer || !stockTitle) return;

    // Clear previous chart
    chartContainer.innerHTML = '';

    // Create new TradingView widget
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.innerHTML = `
      <div class="tradingview-widget-container__widget"></div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[symbol]],
      chartOnly: false,
      width: "100%",
      height: "500",
      locale: "en",
      colorTheme: document.body.classList.contains('light') ? 'light' : 'dark',
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      maLineColor: "#2962FF",
      maLineWidth: 1,
      maLength: 9,
      lineWidth: 2,
      lineType: 0,
      dateRanges: [
        "1d|1",
        "1m|30",
        "3m|60",
        "12m|1D",
        "60m|1W",
        "all|1M"
      ]
    });

    widgetContainer.appendChild(script);
    chartContainer.appendChild(widgetContainer);
    
    // Update title
    const symbolOnly = symbol.includes(':') ? symbol.split(':')[1] : symbol;
    stockTitle.textContent = `${symbolOnly} - ${title}`;
  }
}

// ============ SEARCH FUNCTIONALITY ============
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

    // Input event for live search
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

    // Enter key to select first suggestion
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const firstSuggestion = suggestions.querySelector('.suggestion-item');
        if (firstSuggestion) {
          firstSuggestion.click();
        }
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.classList.remove('show');
      }
    });
  }

  async searchStocks(query, suggestions, errorBox) {
    try {
      errorBox.textContent = '';
      
      // Search in predefined stock data first
      const localResults = this.searchLocalStocks(query);
      
      if (localResults.length > 0) {
        this.showSuggestions(localResults, suggestions);
        return;
      }

      // Fallback to Finnhub API
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=d0of8thr01qsib2c9up0d0of8thr01qsib2c9upg`
      );
      
      if (!response.ok) throw new Error('Search API error');
      
      const data = await response.json();
      
      if (data.count > 0 && data.result) {
        const results = data.result
          .filter(stock => stock.type === 'Common Stock' && stock.symbol)
          .slice(0, 10)
          .map(stock => ({
            symbol: stock.symbol,
            name: stock.description || stock.symbol,
            exchange: this.determineExchange(stock.symbol)
          }));
        
        this.showSuggestions(results, suggestions);
      } else {
        suggestions.innerHTML = '<div class="suggestion-item">No stocks found</div>';
        suggestions.classList.add('show');
      }
    } catch (error) {
      console.error('Search error:', error);
      errorBox.textContent = 'Search temporarily unavailable';
      suggestions.classList.remove('show');
    }
  }

  searchLocalStocks(query) {
    const allStocks = [];
    Object.values(STOCK_DATA).forEach(category => {
      allStocks.push(...category);
    });

    // Remove duplicates
    const uniqueStocks = allStocks.filter((stock, index, self) => 
      index === self.findIndex(s => s.symbol === stock.symbol)
    );

    return uniqueStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }

  determineExchange(symbol) {
    // Simple logic to determine exchange
    const nasdaqSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
    return nasdaqSymbols.includes(symbol) ? 'NASDAQ' : 'NYSE';
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
    // Add to watchlist and select
    const added = this.watchlistManager.addStock(stock);
    if (added) {
      console.log(`Added ${stock.symbol} to watchlist`);
    }
    
    // Select the stock
    this.watchlistManager.selectStock(stock, null);
  }
}

// ============ THEME AND UI MANAGEMENT ============
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
      
      // Reload chart with new theme
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

// ============ MARKET INDICATORS ============
class MarketIndicators {
  constructor() {
    this.indicators = ['SPY', 'VIX'];
    this.updateInterval = 30000; // 30 seconds
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
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=d0of8thr01qsib2c9up0d0of8thr01qsib2c9upg`
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

// ============ NOTIFICATION SYSTEM ============
class NotificationManager {
  static show(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, duration);
  }
}

// ============ ENHANCED FEATURES ============
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
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('stockSearch')?.focus();
      }
      
      // Escape to clear search
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('stockSearch');
        if (searchInput) {
          searchInput.value = '';
          searchInput.blur();
        }
        document.getElementById('searchSuggestions')?.classList.remove('show');
      }
      
      // Arrow keys for navigation
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
      // Open menu
      menuToggle.addEventListener('click', () => {
        sidebarMenu.classList.add('open');
        menuOverlay.classList.add('show');
        menuToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
      
      // Close menu function
      const closeMenu = () => {
        sidebarMenu.classList.remove('open');
        menuOverlay.classList.remove('show');
        menuToggle.classList.remove('active');
        document.body.style.overflow = '';
      };
      
      // Close on overlay click
      if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
      }
      
      // Close on close button
      if (menuClose) {
        menuClose.addEventListener('click', closeMenu);
      }
      
      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebarMenu.classList.contains('open')) {
          closeMenu();
        }
      });
      
      // Setup menu item actions
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
    NotificationManager.show('⚖️ Opening stock comparison tool...', 'info');
  }
  
  handleMarketAction(market) {
    switch (market) {
      case 'US':
        window.watchlistManager.loadCategory('sp500');
        NotificationManager.show('Loaded US Market stocks 🇺🇸', 'success');
        break;
      case 'CA':
        window.watchlistManager.loadCategory('tsx');
        NotificationManager.show('Loaded Canadian Market stocks 🇨🇦', 'success');
        break;
      case 'EU':
        NotificationManager.show('European markets coming soon! 🇪🇺', 'info');
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
    NotificationManager.show(`🎲 Random pick: ${randomStock.symbol}`, 'success');
  }
  
  showTopMovers() {
    // Simulate top movers (in real app, this would fetch from API)
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
    NotificationManager.show('📈 Loaded top movers!', 'success');
  }
  
  resetToDefault() {
    window.watchlistManager.watchlist = [...DEFAULT_WATCHLIST];
    window.watchlistManager.saveWatchlist();
    window.watchlistManager.renderWatchlist();
    NotificationManager.show('🔄 Reset to default watchlist', 'success');
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        NotificationManager.show('🖥️ Entered fullscreen mode', 'success');
      }).catch(() => {
        NotificationManager.show('Fullscreen not supported', 'warning');
      });
    } else {
      document.exitFullscreen().then(() => {
        NotificationManager.show('🪟 Exited fullscreen mode', 'info');
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
        NotificationManager.show('📤 Watchlist shared!', 'success');
      }).catch(() => {
        this.fallbackShare(text);
      });
    } else {
      this.fallbackShare(text);
    }
  }
  
  fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => {
      NotificationManager.show('📋 Watchlist copied to clipboard!', 'success');
    }).catch(() => {
      NotificationManager.show('Sharing not available', 'warning');
    });
  }
  
  openFeedback() {
    const email = 'feedback@stockdashboard.com';
    const subject = 'Stock Dashboard Feedback';
    const body = 'Hi! I\'d like to share some feedback about the Stock Dashboard:\n\n';
    
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    NotificationManager.show('💬 Opening email client...', 'info');
  }
  
  showShortcuts() {
    const shortcuts = [
      'Ctrl/Cmd + F - Focus search',
      'Escape - Close menus/search',
      'Arrow Keys - Navigate stocks',
      'Enter - Select suggestion'
    ];
    
    alert('⌨️ Keyboard Shortcuts:\n\n' + shortcuts.join('\n'));
  }
  
  showAbout() {
    const about = `📖 Stock Dashboard v2.0\n\nA comprehensive stock tracking application with:\n• Real-time charts and data\n• Multiple market categories\n• Dynamic watchlists\n• Global market support\n\nBuilt with ❤️ by Harshil`;
    
    alert(about);
  }
}

// ============ INITIALIZATION ============
function initializeStocksDashboard() {
  // Create global instances
  window.watchlistManager = new WatchlistManager();
  window.stockSearch = new StockSearch(window.watchlistManager);
  window.marketIndicators = new MarketIndicators();
  window.enhancedFeatures = new EnhancedFeatures(window.watchlistManager);
  
  // Setup category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category');
      
      // Update active button
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      
      // Load category with notification
      window.watchlistManager.loadCategory(category);
      NotificationManager.show(`Loaded ${category.toUpperCase()} stocks`, 'success');
    });
  });
  
  // Setup watchlist actions
  const addBtn = document.getElementById('addToWatchlistBtn');
  const clearBtn = document.getElementById('clearWatchlist');
  const exportBtn = document.getElementById('exportWatchlist');
  
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (window.watchlistManager.currentStock) {
        const added = window.watchlistManager.addStock(window.watchlistManager.currentStock);
        if (added) {
          addBtn.textContent = '✓';
          setTimeout(() => addBtn.textContent = '+', 1000);
          NotificationManager.show(
            `Added ${window.watchlistManager.currentStock.symbol} to watchlist`,
            'success'
          );
        } else {
          NotificationManager.show(
            `${window.watchlistManager.currentStock.symbol} is already in watchlist`,
            'warning'
          );
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
    exportBtn.addEventListener('click', () => {
      const watchlist = window.watchlistManager.watchlist;
      if (watchlist.length === 0) {
        NotificationManager.show('No stocks to export', 'warning');
        return;
      }
      
      const csvContent = 'Symbol,Name,Exchange\n' + 
        watchlist.map(stock => `${stock.symbol},"${stock.name}",${stock.exchange}`).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-watchlist.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      NotificationManager.show(`Exported ${watchlist.length} stocks`, 'success');
    });
  }
  
  // Initial render
  window.watchlistManager.renderWatchlist();
  
  // Update bottom ticker with watchlist
  window.watchlistManager.updateBottomTicker();
  
  // Show welcome message
  setTimeout(() => {
    NotificationManager.show('Welcome to your Stock Dashboard! 📊', 'info');
  }, 1000);
}

// ============ PAGE LOAD HANDLERS ============
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  revealOnScroll();
  
  // Initialize stocks dashboard if we're on the stocks page
  if (document.getElementById('watchlist')) {
    initializeStocksDashboard();
  }
});

window.addEventListener('scroll', revealOnScroll);

