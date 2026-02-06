class NetworkClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.clientId = null;
    this.connected = false;
    this.lastPingTime = 0;
    this.ping = 0;
    this.messageHandlers = new Map();
    this.sendQueue = [];
    this.criticalQueue = [];
    this.lastSendTime = 0;
    this.sendInterval = 1000 / 60;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('[NETWORK] Connected to server');
          this.connected = true;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
          console.log('[NETWORK] Disconnected from server');
          this.connected = false;
        };

        this.ws.onerror = (error) => {
          console.error('[NETWORK ERROR]', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  handleMessage(packet) {
    console.log('[NETWORK] Received packet:', packet);
    if (packet.type === 'batch') {
      packet.messages.forEach(msg => this.processMessage(msg));
    } else {
      this.processMessage(packet);
    }
  }

  processMessage(message) {
    const type = message.type || message.data?.type;
    console.log('[NETWORK] Processing message type:', type);
    const handler = this.messageHandlers.get(type);

    if (handler) {
      console.log('[NETWORK] Handler found for:', type);
      handler(message.data || message);
    } else if (type !== 'batch') {
      console.warn(`[NETWORK] No handler for message type: ${type}`);
    }
  }

  on(messageType, handler) {
    console.log('[NETWORK] Registering handler for:', messageType);
    this.messageHandlers.set(messageType, handler);
  }

  send(message, priority = 'normal') {
    if (!this.connected) {
      console.warn('[NETWORK] Not connected, cannot send message');
      return;
    }

    // Message is already structured like {type: 'join', data: {...}}
    // We just need to add timestamp and priority, NOT wrap it again
    const packet = {
      ...message,
      timestamp: Date.now(),
      priority
    };

    console.log('[NETWORK] Queueing message:', {
      type: message.type,
      priority,
      isCritical: priority === 'critical'
    });

    if (priority === 'critical') {
      // Send critical messages immediately
      this.criticalQueue.push(packet);
    } else {
      // Queue normal messages for batch sending
      this.sendQueue.push(packet);
    }
  }

  processSendQueue() {
    // Always send critical messages immediately
    if (this.criticalQueue.length > 0) {
      this.criticalQueue.forEach(packet => {
        if (this.ws.readyState === WebSocket.OPEN) {
          console.log('[NETWORK] Sending CRITICAL packet:', packet);
          this.ws.send(JSON.stringify(packet));
        }
      });
      this.criticalQueue = [];
    }

    const now = Date.now();

    // Send queued messages at the specified interval
    if (now - this.lastSendTime < this.sendInterval) {
      return;
    }

    if (this.sendQueue.length > 0) {
      this.sendQueue.forEach(packet => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(packet));
        }
      });
      this.sendQueue = [];
    }

    this.lastSendTime = now;
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.connected) {
        this.send({ type: 'ping', timestamp: Date.now() }, 'critical');
      }
    }, 10000);
  }

  handlePing(data) {
    this.ping = Date.now() - data.serverTime;
  }

  getPing() {
    return this.ping;
  }

  isConnected() {
    return this.connected;
  }
}
