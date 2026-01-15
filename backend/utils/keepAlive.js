const https = require('https');
const http = require('http');

class KeepAliveService {
  constructor() {
    this.interval = null;
    this.serverUrl = null;
  }

  start(serverUrl) {
    // Don't run keep-alive in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('⏸️  Keep-alive disabled in development');
      return;
    }

    this.serverUrl = serverUrl;
    
    // Ping every 14 minutes (Render free tier spins down after 15 min inactivity)
    const INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds

    this.interval = setInterval(() => {
      this.ping();
    }, INTERVAL);

    console.log('💓 Keep-alive service started (pinging every 14 minutes)');
    console.log(`🎯 Target URL: ${this.serverUrl}`);
  }

  ping() {
    const url = `${this.serverUrl}/health`;
    const protocol = this.serverUrl.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log(`💓 Keep-alive ping successful - ${new Date().toLocaleTimeString()}`);
      } else {
        console.warn(`⚠️  Keep-alive ping returned status: ${res.statusCode}`);
      }
    }).on('error', (error) => {
      console.error('❌ Keep-alive ping failed:', error.message);
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('⏹️  Keep-alive service stopped');
    }
  }
}

module.exports = new KeepAliveService();
