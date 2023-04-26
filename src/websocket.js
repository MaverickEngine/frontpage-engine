export class FrontPageEngineSocketServer {
    constructor(url, domain = "http://localhost", channel, uid = null) {
        this.url = url;
        if (!this.url) {
            throw new Error("No Websocket URL provided");
        }
        this.domain = domain;
        this.channel = channel;
        this.callbacks = [];
        this.uid = uid;
        this.connect();
    }

    connect() {
        this.socket = new WebSocket(this.url);
        // this.socket.onopen = this.onOpen.bind(this);
        this.socket.onclose = this.onClose.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onopen = this.onConnect.bind(this);
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
            this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain, uid: this.uid }));
        } else {
            this.socket.onopen = () => {
                this.socket.send(JSON.stringify({ event: "subscribe", channel: this.channel, domain: this.domain, uid: this.uid }));
            }
        }
    }

    on(name, callback) {
        this.callbacks.push({ name, callback });
    }

    // onOpen(event) {
    //     console.log(event);
    // }

    onConnect() {
        this.subscribe();
    }

    onMessage(encodedMessage) {
        // console.log({ data: message.data });
        const message = JSON.parse(encodedMessage.data);
        console.log("Received message", message);
        Promise.all(this.callbacks.map(callback => {
            console.log("Checking callback", callback.name, message.data);
            if (callback.name === message.data) {
                console.log("Calling callback", callback.name);
                return callback.callback(message);
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
        // console.log("Sending message", message);
        if (typeof message !== 'object' || Array.isArray(message) || message === null) {
            message = { message };
        }
        if (!message.message) {
            throw new Error('Invalid message');
        }
        if (!message.event) {
            message.event = "broadcast";
        }
        message.channel = this.channel;
        message.domain = this.domain;
        // console.log(message);
        // Wait for the connection to be established before sending a message.
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            setTimeout(() => this.sendMessage(message), 100);
        }
    }
}
