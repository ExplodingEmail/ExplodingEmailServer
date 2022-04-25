import WebSocket, {Server} from "ws";
import {IncomingMessage} from "http";
import AuthStorage from "../struct/AuthStorage";
import Email from "../entity/Email";
import Config from "../Config";
import OpCodes from "../enum/OpCodes";
import GetStats from "../db/GetStats";
import User from "../entity/User";
import Inbox from "../entity/Inbox";
import HTTPServer from "./HTTPServer";
import ValidateTextRecord from "../util/ValidateTextRecord";

/**
 * Handles the WebSocket connections for gateway.exploding.email.
 */
export default class WebSocketServer {
    
    private wss: WebSocket.Server;
    private auth_storage: AuthStorage;
    
    private clients = new Map<string, User>();
    private expiration = new Map<string, number>();
    
    private stats: GetStats = new GetStats();
    
    /**
     * Constructor for the WebSocket server.
     */
    public constructor() {
        
        this.auth_storage = new AuthStorage();
        
        const http_server = new HTTPServer(Config.WS_PORT);
        
        this.wss = new Server({
            server: http_server.http_server,
        });
        
        http_server.start();
        
        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
            this.onConnection(ws, req);
        });
        
        //check for expired inboxes every 5 minutes
        setInterval(() => {
            this.checkExpiredInboxes();
        }, 300000);
    }
    
    /**
     * On websocket connection.
     * 
     * @param ws {WebSocket} The websocket connection.
     * @param req {IncomingMessage} The request.
     * @private
     */
    private onConnection(ws: WebSocket, req: IncomingMessage) {
        const user = new User(ws);
        
        if(!req.url) {
            return user.terminate(OpCodes.INVALID_URI, "No URI specified");
        }
        
        const interval_id = setInterval(async () => {
            user.sendStats(await this.stats.getStats(), this.clients.size);
        }, 1000); //this also acts as a heartbeat
        
        ws.on("close", () => {
            clearInterval(interval_id);
        });
        
        user.addListener(OpCodes.DELETE_INBOX, (data) => {
            const token = data.token;
            
            if(!token) {
                return user.terminate(OpCodes.INVALID_TOKEN, "No token specified");
            }
            
            this.deleteInbox(token, user);
        });
        
        //if the url is `/generate`, generate a new token and send it to the client
        //if it is `/auth/<token>`, authenticate the client with the token
        const url = req.url;
        
        ws.send(JSON.stringify({
            op: OpCodes.VERSION,
            version: Config.VERSION,
        }));
        
        if(url.startsWith("/generate")) { //generate a new email/token pair
            this.generate(user);
        } else if(url.startsWith("/auth/")) { //if the user already has an email and is resuming, authenticate here
            const token = url.substring(6);
            
            this.resume(user, token);
            
        } else if(url.startsWith("/custom/")) {
            //url: /custom/<key>/<domain>
            const url_parts = url.split("/");
            
            if(url_parts.length !== 4) {
                return user.terminate(OpCodes.INVALID_URI, "Invalid URI");
            }
            
            const key = url_parts[2];
            const domain = url_parts[3];
            
            if(!key || !domain) {
                return user.terminate(OpCodes.INVALID_URI, "Invalid URI");
            }
            
            return this.customLoader(user, key, domain);
        } else { //else, the url is invalid
            return user.terminate(OpCodes.INVALID_URI, "Invalid URL.");
        }
    }
    
    /**
     * Custom domain handler
     * @param user {User} The user.
     * @param key {string} The key.
     * @param domain {string} The domain.
     * @private
     */
    private async customLoader(user: User, key: string, domain: string): Promise<void> {
        const vtr = new ValidateTextRecord(domain);
        
        if(!await vtr.hasKey(key)) {
            return user.terminate(OpCodes.INVALID_KEY, "Invalid key");
        }
        
        const exp_date = Date.now() + (Config.INBOX_EXPIRATION * 1000);
        
        this.clients.set("*@" + domain, user);
        this.expiration.set("*@" + domain, exp_date);
        
        user.newInbox("*@" + domain, "", exp_date);
    }
    
    /**
     * Check for expired inboxes and delete them.
     * @private
     */
    private checkExpiredInboxes() {
        
        const client_count = this.clients.size;
        const now = Date.now();
        
        for(const [email, expiration] of this.expiration) {
            if(expiration < now) {
                this.clients.get(email)?.expired();
                this.clients.delete(email);
                this.expiration.delete(email);
            }
        }
        
        console.log(`${this.clients.size - client_count} expired inboxes were deleted.`);
    }
    
    /**
     * Generate a new inbox.
     * @param user {User} The user to generate the inbox for.
     * @private
     */
    private generate(user: User) {
        
        const exp_date = Date.now() + (Config.INBOX_EXPIRATION * 1000);
        
        const new_email = this.auth_storage.generateNewEmail(exp_date);
        
        //send email/token to client
        user.newInbox(new_email.address, new_email.token, new_email.expiration);
        //add to clients
        this.clients.set(new_email.address, user);
        this.expiration.set(new_email.address, exp_date);
    }
    
    /**
     * Resume the inbox.  This will check for token
     * validity and then send the inbox to the client.
     * 
     * @param user {User} The user to resume.
     * @param token {string} The token to authenticate with.
     * @private
     */
    private resume(user: User, token: string) {
        const email = this.auth_storage.getEmail(token);
        
        //expired/invalid token
        if(!email) {
            return user.terminate(OpCodes.INVALID_TOKEN, "Invalid token.");
        }
        
        this.clients.set(email, user);
        
        user.resume(new Inbox(email, token, this.expiration.get(email) || 0));
    }
    
    /**
     * Send a message to a specific client.
     *
     * @param email {Email} the email to send.
     * @returns {boolean} true if the message was sent, false otherwise.
     */
    public sendMessage(email: Email): boolean {
        
        const domains = Config.URIS;
        
        const email_domain = email.to.split("@")[1];
        
        let to = email.to;
    
        if(email_domain && !domains.includes(email_domain)) {
            to = "*@" + email_domain;
        }
        
        const client = this.clients.get(to);
        
        this.stats.incrementStats().then(() => {
            console.log("Incremented stats.");
        });
        
        
        //expired/invalid email
        if(!client) {
            return false;
        }
        
        client.sendEmail(email);
        
        return true;
    }
    
    /**
     * Delete an inbox provided the token and user.
     * @param token {string} The token to authenticate with.
     * @param user {User} The user to delete the inbox for.
     * @private
     */
    private deleteInbox(token: string, user: User) {
        const deleted_email = this.auth_storage.deleteEmail(token);
        
        if(!deleted_email) {
            return user.terminate(OpCodes.DELETE_FAILURE, "Invalid token.");
        }
        
        this.clients.delete(deleted_email);
        
        return user.close(OpCodes.DELETE_SUCCESS, "Deleted.  Please re-connect.");
    }
}
