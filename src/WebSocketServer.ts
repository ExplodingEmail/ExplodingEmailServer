import WebSocket, {Server} from "ws";
import {createServer, IncomingMessage, ServerResponse} from "http";
import AuthStorage from "./AuthStorage";
import Email from "./entity/Email";
import Config from "./Config";
import OpCodes from "./enum/OpCodes";
import GetStats from "./db/GetStats";
import {readFileSync} from "fs";

/**
 * Handles the WebSocket connections for gateway.exploding.email.
 */
export default class WebSocketServer {
    
    private wss: WebSocket.Server;
    private auth_storage: AuthStorage;
    
    private clients = new Map<string, WebSocket>();
    private expiration = new Map<string, number>();
    
    private stats: GetStats = new GetStats();
    
    /**
     * Terminate a WebSocket connection with an OpCode and reason.
     * 
     * @param op {number} OpCode to send.
     * @param error {string | undefined} Reason for the termination.
     * @param ws {WebSocket} WebSocket to terminate.
     * @param message {string | undefined} non-error message to send.
     * @private
     */
    private static terminate(op: number, error: string | undefined, ws: WebSocket, message: string | undefined = undefined): void {
        if(!message) {
            ws.send(JSON.stringify({
                error: error,
                terminated: true,
                op: op,
            }));
        } else {
            ws.send(JSON.stringify({
                terminated: true,
                op: op,
                message: message,
            }));
        }
        ws.terminate();
    }
    
    /**
     * Constructor for the WebSocket server.
     */
    public constructor() {
        
        const http_server = createServer((req: IncomingMessage, res: ServerResponse) => {
            if(req.headers.host === "ttqp5vp3ylxrhpnfkehpzsslabaa7qxdur255jxgwmiisshv2wdntkid.onion") {
                res.writeHead(200, {
                    "Content-Type": "text/html",
                });
                res.end(readFileSync("minimal.html").toString());
            } else {
                res.writeHead(302, {
                    "Location": "https://exploding.email",
                });
                res.end();
            }
        }).listen(Config.WS_PORT);
        
        this.wss = new Server({
            server: http_server,
        });
        
        this.auth_storage = new AuthStorage();
        
        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
            if(!req.url) {
                return WebSocketServer.terminate(OpCodes.INVALID_URI, "No URI specified", ws);
            }
            
            const interval_id = setInterval(async () => {
                ws.send(JSON.stringify({
                    op: OpCodes.STATISTICS_REQUEST_RESPONSE,
                    statistics: {
                        emails_received: await this.stats.getStats(),
                        clients: this.clients.size,
                    },
                }));
            }, 1000); //this also acts as a heartbeat
            
            ws.on("close", () => {
                clearInterval(interval_id);
            });
            
            ws.on("message", (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if(!message.op) {
                        return WebSocketServer.terminate(OpCodes.INVALID_OPCODE, "No operation specified.", ws);
                    }
                    
                    if(message.op === OpCodes.DELETE_INBOX) {
                        const token = message.token;
                        if(!token) {
                            return WebSocketServer.terminate(OpCodes.INVALID_TOKEN, "No token specified.", ws);
                        }
                        
                        const deleted_email = this.auth_storage.deleteEmail(token);
                        
                        if(!deleted_email) {
                            return WebSocketServer.terminate(OpCodes.DELETE_FAILURE, "Invalid token.", ws);
                        }
                        
                        this.clients.delete(deleted_email);
                        
                        return WebSocketServer.terminate(OpCodes.DELETE_SUCCESS, undefined, ws, "Deleted.  Please re-connect.");
                    }
                    
                } catch(e) {
                    return WebSocketServer.terminate(OpCodes.INVALID_JSON, "Invalid JSON.", ws);
                }
            });
            
            //if the url is `/generate`, generate a new token and send it to the client
            //if it is `/auth/<token>`, authenticate the client with the token
            const url = req.url;
            
            ws.send(JSON.stringify({
                op: OpCodes.VERSION,
                version: Config.VERSION,
            }));
            
            if(url.startsWith("/generate")) { //generate a new email/token pair
                
                const exp_date = Date.now() + (Config.INBOX_EXPIRATION * 1000);
                
                const new_email = this.auth_storage.generateNewEmail(exp_date);
                
                //send email/token to client
                ws.send(JSON.stringify({
                    email: new_email.address,
                    token: new_email.token,
                    expires: new_email.expiration,
                    op: OpCodes.HERE_IS_YOUR_EMAIL_AND_TOKEN,
                }));
                
                //add to clients
                this.clients.set(new_email.address, ws);
                this.expiration.set(new_email.address, exp_date);
            } else if(url.startsWith("/auth/")) { //if the user already has an email and is resuming, authenticate here
                const token = url.substring(6);
                
                const email = this.auth_storage.getEmail(token);
                
                //expired/invalid token
                if(!email) {
                    return WebSocketServer.terminate(OpCodes.INVALID_TOKEN, "Invalid token.", ws);
                }
                
                this.clients.set(email, ws);
                
                ws.send(JSON.stringify({
                    email: email,
                    op: OpCodes.RESUME_SUCCESS,
                }));
            } else { //else, the url is invalid
                return WebSocketServer.terminate(OpCodes.INVALID_URI, "Invalid URL.", ws);
            }
            
        });
        
        //check for expired emails every 5 minutes
        setInterval(() => {
            const client_count = this.clients.size;
            const now = Date.now();
            
            for(const [email, expiration] of this.expiration) {
                if(expiration < now) {
                    this.clients.delete(email);
                    this.expiration.delete(email);
                }
            }
            console.log(`${this.clients.size - client_count} expired inboxes were deleted.`);
        }, 300000);
    }
    
    
    /**
     * Send a message to a specific client.
     *
     * @param email {Email} the email to send.
     * @returns {boolean} true if the message was sent, false otherwise.
     */
    public sendMessage(email: Email): boolean {
        const client = this.clients.get(email.to);
        
        this.stats.incrementStats().then(() => {
            console.log("Incremented stats.");
        });
        
        //expired/invalid email
        if(!client) {
            return false;
        }
        
        client.send(JSON.stringify({
            type: "email",
            data: JSON.parse(JSON.stringify(email)), //kind of a hack, but it works.
            op: OpCodes.EMAIL_INCOMING,
        }));
        
        return true;
    }
    
}
