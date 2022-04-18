import WebSocket, {Server} from "ws";
import {IncomingMessage} from "http";
import AuthStorage from "./AuthStorage";
import Email from "./entity/Email";
import Config from "./Config";
import OpCodes from "./enum/OpCodes";

export default class WebSocketServer {
    
    private wss: WebSocket.Server;
    private auth_storage: AuthStorage;
    
    private clients = new Map<string, WebSocket>();
    private experation = new Map<string, number>();
    
    private emails_received = 0;
    
    private terminate(op: number, error: string | undefined, ws: WebSocket, message: string | undefined = undefined): void {
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
        this.wss = new Server({
            port: Config.WS_PORT,
        });
        
        this.auth_storage = new AuthStorage();
        
        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
            if(!req.url) {
                return this.terminate(OpCodes.INVALID_URI, "No URI specified", ws);
            }
            
            ws.send(JSON.stringify({
                op: OpCodes.STATISTICS_REQUEST_RESPONSE,
                statistics: {
                    emails_received: this.emails_received,
                    clients: this.clients.size,
                },
            }));
            
            const interval_id = setInterval(() => {
                ws.send(JSON.stringify({
                    op: OpCodes.STATISTICS_REQUEST_RESPONSE,
                    statistics: {
                        emails_received: this.emails_received,
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
                        return this.terminate(OpCodes.INVALID_OPCODE, "No operation specified.", ws);
                    }
                    
                    if(message.op === OpCodes.DELETE_INBOX) {
                        const token = message.token;
                        if(!token) {
                            return this.terminate(OpCodes.INVALID_TOKEN, "No token specified.", ws);
                        }
                        
                        const deleted_email = this.auth_storage.deleteEmail(token);
                        
                        if(!deleted_email) {
                            return this.terminate(OpCodes.DELETE_FAILURE, "Invalid token.", ws);
                        }
                        
                        this.clients.delete(deleted_email);
                        
                        return this.terminate(OpCodes.DELETE_SUCCESS, undefined, ws, "Deleted.  Please re-connect.");
                    }
                    
                } catch(e) {
                    return this.terminate(OpCodes.INVALID_JSON, "Invalid JSON.", ws);
                }
            });
            
            //if the url is `/generate`, generate a new token and send it to the client
            //if it is `/auth/<token>`, authenticate the client with the token
            const url = req.url;
            
            if(url.startsWith("/generate")) { //generate a new email/token pair
                const new_email = this.auth_storage.generateNewEmail();
                
                if(!new_email[0] || !new_email[1]) {
                    return this.terminate(OpCodes.GENERATION_FAILURE, "Failed to generate new email.", ws);
                }
                
                //send email/token to client
                ws.send(JSON.stringify({
                    email: new_email[0],
                    token: new_email[1],
                    op: OpCodes.HERE_IS_YOUR_EMAIL_AND_TOKEN,
                }));
                
                //add to clients
                this.clients.set(new_email[0], ws);
                this.experation.set(new_email[0], Date.now() + (Config.INBOX_EXPIRATION * 1000));
            } else if(url.startsWith("/auth/")) { //if the user already has an email and is resuming, authenticate here
                const token = url.substring(6);
                
                const email = this.auth_storage.getEmail(token);
                
                //expired/invalid token
                if(!email) {
                    return this.terminate(OpCodes.INVALID_TOKEN, "Invalid token.", ws);
                }
                
                this.clients.set(email, ws);
                
                ws.send(JSON.stringify({
                    email: email,
                    op: OpCodes.RESUME_SUCCESS,
                }));
            } else { //else, the url is invalid
                return this.terminate(OpCodes.INVALID_URI, "Invalid URL.", ws);
            }
            
        });
    }
    
    
    /**
     * Send a message to a specific client.
     *
     * @param email {Email} the email to send.
     * @returns {boolean} true if the message was sent, false otherwise.
     */
    public sendMessage(email: Email): boolean {
        const client = this.clients.get(email.to);
        this.emails_received++;
        
        if(!client) {
            console.log("No client found for email: " + email.to);
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
