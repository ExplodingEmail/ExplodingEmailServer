#!

import EmailServer from "./EmailServer";
import WebSocketServer from "./WebSocketServer";
import Config from "./Config";

const ws_server = new WebSocketServer();

new EmailServer(Config.SMTP_PORT, ((email) => {
    ws_server.sendMessage(email);
}));

