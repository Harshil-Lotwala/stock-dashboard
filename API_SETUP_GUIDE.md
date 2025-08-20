#  Stock Dashboard - Complete Setup Guide

##  What's Already Working
Your stock dashboard is **already functional** with:
-  Stock search and charts (using provided Finnhub API key)
-  Real-time market data
-  Interactive watchlists
-  TradingView charts and widgets
-  All basic functionality

##  Optional Customizations for Full Features

### 1. **Finnhub API (Stock Data) - ALREADY CONFIGURED **
**Current Status:** Working with provided API key
**Location:** `js/configure.js`

**To get your own FREE API key:**
1. Visit: https://finnhub.io/register
2. Create free account
3. Go to Dashboard → API
4. Copy your API key
5. Replace in `js/configure.js`:
```javascript
const FINNHUB_API_KEY = "your-new-api-key-here";
```

**Free Plan Limits:** 60 API calls/minute, 30,000 calls/month

---

### 2. **Google AdSense (Monetization) - OPTIONAL**
**Current Status:** Placeholder values
**Location:** `stocks.html` lines 16, 113-115

**To enable ads:**
1. Visit: https://www.google.com/adsense/
2. Create AdSense account
3. Get your Publisher ID (ca-pub-XXXXXXXXXX)
4. Create ad units and get ad slot IDs
5. Replace placeholders in `stocks.html`:
```html
<!-- Replace both instances -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR-PUBLISHER-ID"></script>

<!-- And -->
<ins class="adsbygoogle"
     data-ad-client="ca-pub-YOUR-PUBLISHER-ID"
     data-ad-slot="YOUR-AD-SLOT-ID">
</ins>
```

---

### 3. **Google Analytics (Tracking) - OPTIONAL**
**Current Status:** Placeholder values
**Location:** `stocks.html` lines 20, 25

**To enable analytics:**
1. Visit: https://analytics.google.com/
2. Create Google Analytics 4 property
3. Get Measurement ID (G-XXXXXXXXXX)
4. Replace in `stocks.html`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR-MEASUREMENT-ID"></script>
<script>
  gtag('config', 'G-YOUR-MEASUREMENT-ID');
</script>
```

---

### 4. **Affiliate Links (Monetization) - OPTIONAL**
**Current Status:** Using default referral links
**Location:** `stocks.html` lines 130-142

**To use your own affiliate IDs:**
- **TradingView:** Replace `YOUR_ID` with your TradingView affiliate ID
- **Robinhood:** Use your referral link
- **Webull:** Use your referral link

---

##  Ready to Use Features

### **Stock Search & Charts**
- Search any stock symbol (AAPL, TSLA, etc.)
- Real-time price data
- Interactive TradingView charts
- Multiple timeframes

### **Pre-loaded Categories**
- Dow 30
- S&P 500
- NASDAQ 100
- TSX (Canadian)
- Trending stocks
- AI/Tech stocks

### **Watchlist Features**
- Add/remove stocks
- Export to CSV
- Persistent storage
- Real-time updates

### **Market Data**
- S&P 500 index
- VIX volatility index
- Real-time updates every 30 seconds

### **Interactive Features**
- Dark/Light theme toggle 
- Keyboard shortcuts
- Mobile responsive
- Fullscreen mode
- Share watchlists

---

##  Important Notes

### **CORS and Local Testing**
If testing locally, you may need to:
1. Use a local web server (not file:// protocol)
2. Try: `python3 -m http.server 8000` in your project directory
3. Access via: `http://localhost:8000`

### **API Rate Limits**
- **Finnhub Free:** 60 calls/minute, 30,000/month
- Search uses local data first to preserve API calls
- Market indicators update every 30 seconds

### **Browser Security**
Some features require HTTPS in production:
- Clipboard API (share functionality)
- Fullscreen API
- Geolocation (if added)

---

## Testing Your Setup

1. **Open `stocks.html` in browser**
2. **Test stock search:** Try typing "AAPL" or "TSLA"
3. **Check charts:** Click on any stock in watchlist
4. **Try categories:** Click "S&P 500" or "Dow 30" buttons
5. **Test theme:** Click the 🌞 toggle
6. **Check console:** F12 → Console for any errors

---

## 📞 Support

If you need help:
1. Check browser console (F12) for errors
2. Verify all files are in correct locations
3. Test with different browsers
4. Try local server instead of file:// protocol

Your dashboard should be **fully functional right now** with the current configuration!
