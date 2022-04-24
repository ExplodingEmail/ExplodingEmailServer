import WebSocket from "ws";
import OpCodes from "../enum/OpCodes";
import OpValidator from "../util/OpValidator";
import Email from "./Email";
import Inbox from "./Inbox";

export default class User {
    
    private listeners = new Map<number, (data: any) => void>();
    
    public constructor(
        private readonly ws: WebSocket,
    ) {
        ws.on("message", (data, bin) => {
            if(bin) return;
            
            this.onMessage(data.toString());
        });
    }
    
    /**
     * On user message.
     * @param message {string}
     * @private
     */
    private onMessage(message: string) {
        try {
            const data = JSON.parse(message);
            const listener = this.listeners.get(data.op);
            if(!OpValidator.validate(data.op, data)) {
                return this.terminate(OpCodes.INVALID_JSON, "Invalid JSON");
            }
            if(listener) {
                listener(data);
            }
        } catch(e) {
            this.terminate(OpCodes.INVALID_JSON, "Invalid JSON");
        }
    }
    
    
    /**
     * Add an event listener to the user.
     * @param op {number} The opcode to listen for.
     * @param listener {Function} The function to call when the event is triggered.
     */
    public addListener(op: number, listener: (data: any) => void) {
        this.listeners.set(op, listener);
    }
    
    /**
     * Terminate the connection with an error.
     * @param op {number} The opcode to send.
     * @param error {string} The error message.
     */
    public terminate(op: number, error: string) {
        this.ws.send(JSON.stringify({
            error: error,
            terminated: true,
            op: op,
        }));
        
        this.ws.terminate();
    }
    
    /**
     * Close the socket with a message
     * @param op {number} The opcode to send.
     * @param message {string} The message to send.
     */
    public close(op: number, message: string) {
        this.ws.send(JSON.stringify({
            terminated: true,
            op: op,
            message: message,
        }));
        
        this.ws.close();
    }
    
    /**
     * Send a raw message to the user.
     * @param message {string} the message to send.
     */
    public sendRaw(message: string): void {
        this.ws.send(message);
    }
    
    /**
     * Send the statistics to the user.
     * @param emails_received {number} The number of emails received.
     * @param clients {number} The number of clients.
     */
    public sendStats(emails_received: number, clients: number) {
        this.ws.send(JSON.stringify({
            op: OpCodes.STATISTICS_REQUEST_RESPONSE,
            statistics: {
                emails_received,
                clients,
            }
        }));
    }
    
    /**
     * Send an email object to the user.
     * @param email {Email} The email to send.
     */
    public sendEmail(email: Email) {
        this.ws.send(JSON.stringify({
            type: "email",
            data: JSON.parse(JSON.stringify(email)), //otherwise it sends [object Object]
            op: OpCodes.EMAIL_INCOMING,
        }));
    }
    
    /**
     * Send the resume data to the user.
     * @param inbox {Inbox} The inbox to send.
     */
    public resume(inbox: Inbox) {
        this.ws.send(JSON.stringify({
            op: OpCodes.RESUME_SUCCESS,
            email: inbox.address,
            expires: inbox.expiration,
        }));
    }
    
    /**
     * Notify the user that their inbox has expired.
     */
    public expired() {
        this.close(OpCodes.INBOX_EXPIRED, "Inbox expired.");
    }
    
    public newInbox(email: string, token: string, expires: number) {
        this.ws.send(JSON.stringify({
            email: email,
            token: token,
            expires: expires,
            op: OpCodes.HERE_IS_YOUR_EMAIL_AND_TOKEN,
        }));
    }
    
}
