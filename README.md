#  Stock Dashboard

A modern, responsive stock market dashboard featuring real-time stock data, interactive charts, weather integration, and comprehensive market analysis tools.

Created by Harshil Lotwala

![Stock Dashboard Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Version](https://img.shields.io/badge/Version-2.0-orange)

##  Features

### Stock Market Features
- **Real-time Stock Data**: Live stock prices and charts via Finnhub API
- **Interactive Charts**: Professional TradingView charts with technical indicators
- **Customizable Watchlists**: Add, remove, and organize stocks by categories
- **Market Indicators**: Real-time SPY and VIX data
- **Search Functionality**: Intelligent stock search with auto-suggestions
- **Multiple Exchanges**: Support for NASDAQ, NYSE, TSX, LSE, and more
- **Export Capability**: Export watchlists to CSV with current prices

### Weather Integration
- **Live Weather Data**: Real-time weather using WeatherAPI.com
- **Location-based**: Automatic location detection with detailed weather metrics
- **Comprehensive Data**: Temperature, humidity, wind, UV index, pressure, visibility
- **Beautiful UI**: Modern glass-morphism design with floating animations

### User Experience
- **Dark/Light Theme**: Toggle between themes with preference saving
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Modern UI**: Glass-morphism effects, gradients, and smooth animations
- **Keyboard Shortcuts**: Efficient navigation and search functionality

### Technical Features
- **ROI Calculator**: Investment return calculations
- **Market Analysis**: Technical analysis tools and insights
- **Performance Optimized**: Fast loading with efficient data management
- **Cross-browser Compatible**: Works on all modern browsers

##  APIs Used

### 1. Finnhub API
- **Purpose**: Real-time stock data, prices, and company information
- **Endpoint**: `https://finnhub.io/api/v1/`
- **Features**: Stock quotes, search, market data
- **Rate Limit**: 60 calls/minute (free tier)

### 2. **WeatherAPI.com**
- **Purpose**: Real-time weather data and forecasts
- **Endpoint**: `https://api.weatherapi.com/v1/`
- **Features**: Current weather, location data, detailed metrics
- **Rate Limit**: 1M calls/month (free tier)

### 3. **TradingView Widgets**
- **Purpose**: Professional stock charts and market data visualization
- **Features**: Interactive charts, technical indicators, market overviews
- **Integration**: Embedded widgets and custom chart implementations

## How to Run

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for API calls
- Optional: Local web server for development

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Harshil-Lotwala/stock-dashboard.git
   cd stock-dashboard
   ```

2. **Open in browser:**
   - Simply open `index.html` in your web browser
   - Or serve via local server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx http-server
     
     # Using PHP
     php -S localhost:8000
     ```

3. Access the application:
   - Direct file: `file:///path/to/index.html`
   - Local server: `http://localhost:8000`

### Configuration (Optional)
- **API Keys**: The dashboard includes demo API keys that work out of the box
- **Custom Configuration**: Edit `js/configure.js` to add your own API keys
- **Weather Location**: Automatically detects user location or uses fallback data

## Key Features Breakdown

### Stock Data Management
- **Real-time Updates**: Prices update automatically
- **Watchlist Persistence**: Your selections are saved locally
- **Category Switching**: Quick access to market segments
- **Export Functionality**: CSV export with current prices

### Weather Integration
- **Location Services**: Automatic location detection
- **Comprehensive Metrics**: Temperature, feels-like, humidity, wind, UV, pressure
- **Visual Design**: Modern cards with hover effects and animations
- **Error Handling**: Graceful fallback for API failures

### User Interface
- **Theme System**: Dark/light mode with system preference detection
- **Responsive Layout**: Adapts to all screen sizes
- **Keyboard Navigation**: Full keyboard support for power users
- **Loading States**: Smooth loading animations and placeholders

## File Structure


stock-dashboard/
├── index.html              # Landing page
├── stocks.html             # Main dashboard
├── will-apple-stock-go-up.html # Apple analysis
├── test-search.html        # Search functionality test
├── css/
│   └── style.css          # Main stylesheet with modern design
├── js/
│   ├── script.js          # Core application logic
│   ├── stockData.js       # Stock data and categories
│   ├── configure.js       # API configuration
│   └── dynamicStockData.js # Dynamic data management
├── README.md              # Project documentation
├── API_SETUP_GUIDE.md     # API setup instructions
└── vercel.json           # Deployment configuration













