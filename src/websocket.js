export class FrontPageEngineSocketServer {
    constructor(domain = "http://localhost", channel = "default") {
        this.domain = domain;
        this.channel = channel;
        this.connect();
        this.callbacks = [];
    }

    connect() {
        this.socket = new WebSocket('wss://wssb.revengine.dailymaverick.co.za/_ws/');
        this.socket.onopen = this.onOpen.bind(this);
        this.socket.onclose = this.onClose.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        if (this.channel) {
            this.subscribe();
        }
    }

    close() {
        this.channel = null;
        this.domain = null;
        this.socket.close();
    }

    subscribe(channel = null) {
        if (channel) {
            this.channel = channel;
        }
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain }));
        } else {
            this.socket.onopen = () => {
                this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain }));
            }
        }
    }

    on(event, callback) {
        this.callbacks.push({ event, callback });
    }

    onOpen(event) {
        console.log(event);
    }

    onMessage(event) {
        console.log({ data: event.data });
        const data = JSON.parse(event.data);
        Promise.all(this.callbacks.map(callback => {
            if (callback.event === data.message) {
                console.log("Calling callback", callback.event);
                return callback.callback(data);
            }
        }));
    }

    onClose(event) {
        // Reconnect
        console.log("Reconnecting...");
        this.connect();
        console.log(event);
    }

    sendMessage(message) {
        console.log("Sending message", message);
        if (typeof message !== 'object' || Array.isArray(message) || message === null) {
            message = { message };
        }
        if (!message.message) {
            throw new Error('Invalid message');
        }
        if (!message.event) {
            message.event = "message";
        }
        message.channel = this.channel;
        message.domain = this.domain;
        console.log(message);
        // Wait for the connection to be established before sending a message.
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            setTimeout(() => this.sendMessage(message), 100);
        }
    }
}
