class WebSocketClient {
  constructor() {
    // Wait for DOM to be fully loaded before initializing WebSocket
    if (document.readyState === 'complete') {
      this.initialize();
    } else {
      window.addEventListener('load', () => this.initialize());
    }
  }

  initialize() {
    this.url = this.getWebSocketUrl();
    console.log(`WebSocket URL determined: ${this.url}`);
    // Only connect if we're not showing the initial "enable JavaScript" message
    if (document.getElementById('root') && document.getElementById('root').children.length > 0) {
      this.connect();
    } else {
      console.log("App not properly loaded yet, delaying WebSocket connection");
      setTimeout(() => this.initialize(), 1000);
    }
  }

  getWebSocketUrl() {
    // Force port 10000 for local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `ws://localhost:10000/ws`;
    }
    
    // For production or other environments
    return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
  }

  connect() {
    console.log(`Attempting WebSocket connection to ${this.url}`);
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        // Attempt to reconnect after delay
        setTimeout(() => this.connect(), 5000);
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
    }
  }
  
  // ...existing code...
}

// Export as a function that creates the client only when needed
// This helps avoid issues with code execution before the DOM is ready
let websocketClient = null;
export default function getWebSocketClient() {
  if (!websocketClient) {
    websocketClient = new WebSocketClient();
  }
  return websocketClient;
}
