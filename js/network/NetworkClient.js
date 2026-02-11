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

        // Improved onclose logging for debugging: show code/reason/wasClean
        this.ws.onclose = (event) => {
          console.log('[NETWORK] Disconnected from server', { code: event.code, reason: event.reason, wasClean: event.wasClean });
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
      // Send critical messages IMMEDIATELY
      if (this.ws.readyState === WebSocket.OPEN) {
        console.log('[NETWORK] 🚀 IMMEDIATELY Sending CRITICAL packet:', packet);
        this.ws.send(JSON.stringify(packet));
      } else {
        console.warn('[NETWORK] WebSocket not open, queueing critical message');
        this.criticalQueue.push(packet);
      }
    } else {
      // Queue normal messages for batch sending
      this.sendQueue.push(packet);
    }
  }

  processSendQueue() {
    // Send any remaining critical messages (shouldn't be many if we're sending immediately)
    if (this.criticalQueue.length > 0) {
      this.criticalQueue.forEach(packet => {
        if (this.ws.readyState === WebSocket.OPEN) {
          console.log('[NETWORK] Sending queued CRITICAL packet:', packet);
          this.ws.send(JSON.stringify(packet));
        }
      });
      this.criticalQueue = [];
    }

    const now = Date.now();
    if (now - this.lastSendTime < this.sendInterval) return;

    if (this.sendQueue.length === 0) return;

    // Batch messages into a single packet
    const batch = {
      type: 'batch',
      messages: this.sendQueue.splice(0, 50),
      timestamp: Date.now()
    };

    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(batch));
        console.log('[NETWORK] Sent batch of', batch.messages.length);
      } catch (e) {
        console.error('[NETWORK] Failed to send batch', e);
      }
    } else {
      // Re-queue if socket is not open
      console.warn('[NETWORK] WebSocket not open, re-queueing batch');
      this.sendQueue = batch.messages.concat(this.sendQueue);
    }

    this.lastSendTime = now;
  }

  startHeartbeat() {
    // send initial ping
    this.lastPingTime = Date.now();
    this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now(), priority: 'critical' }));

    // send regular pings
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now(), priority: 'critical' }));
      }
    }, 5000);
  }

  handlePing(data) {
    // server pong: compute ping
    if (data && data.serverTime) {
      const now = Date.now();
      this.ping = now - data.serverTime;
    }
  }

  getPing() {
    return this.ping;
  }
}
