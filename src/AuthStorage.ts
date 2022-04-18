import Config from "./Config";
import {randomBytes} from "crypto";
import Inbox from "./entity/Inbox";

/**
 * Stores emails and tokens.
 */
export default class AuthStorage {
    
    private users: { [key: string]: string } = {};
    
    public constructor() {
        console.log("AuthStorage: constructor");
    }
    
    /**
     * Generate a new email.
     * 
     * @returns {Inbox}
     */
    public generateNewEmail(): Inbox {
        const addresses = Config.URIS;
        
        //pick a random address
        const address = addresses[Math.floor(Math.random() * addresses.length)];
        
        //generate a random email
        const email = Math.random().toString(36).substring(2, 8) + Math.random().toString(10).substring(2, 8) + "@" + address;
        
        //generate a random session id
        const session_id = randomBytes(64).toString("base64url");
        
        //store the email and session id
        this.users[session_id] = email;
        
        return new Inbox(email, session_id);
    }
    
    /**
     * Get the email associated with the session id.
     * 
     * @param session_id {string} the session id.
     * @returns {string} the email associated with the session id (or undefined if not found).
     */
    public getEmail(session_id: string): string | undefined {
        return this.users[session_id];
    }
    
    /**
     * Deletes the email associated with the session id.
     * 
     * @param session_id {string} the session id.
     * @returns {string | undefined} the email associated with the session id (or undefined if not found).
     */
    public deleteEmail(session_id: string): string | undefined {
        const email = this.users[session_id];
        delete this.users[session_id];
        return email;
    }
}
