#!/usr/bin/env node

import EmailServer from "./srv/EmailServer";
import WebSocketServer from "./srv/WebSocketServer";
import Config from "./Config";
import GetStats from "./db/GetStats";

const ws_server = new WebSocketServer();

new EmailServer(Config.SMTP_PORT, ((email) => {
    ws_server.sendMessage(email);
}));

new GetStats().getStats().then(() => {
    console.log("Stats working");
});
