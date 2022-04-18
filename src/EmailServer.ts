import Email from "./entity/Email";
import {SMTPServer, SMTPServerDataStream, SMTPServerSession} from "smtp-server";
import {simpleParser} from "mailparser";
import Config from "./Config";

/**
 * Handles the incoming emails.
 */
export default class EmailServer {
    
    private server: SMTPServer;
    
    /**
     * Creates a new EmailServer.
     * @param port {number} The port to listen on.
     * @param listener {listener: (email: Email) => any} The listener to call when an email is received.
     */
    public constructor(port: number, listener: (email: Email) => void) {
        this.server = new SMTPServer({
            name: Config.SERVER_NAME,
            secure: false,
            authOptional: true,
            sessionTimeout: 20,
            size: 1048576, //1MB
            disabledCommands: ["AUTH", "STARTTLS"],
            onData(stream: SMTPServerDataStream, session: SMTPServerSession, callback: (err?: (Error | null)) => void) {
                let stringbuff = "";
                
                if(stream.sizeExceeded) {
                    callback(new Error("Message size exceeded"));
                    return;
                }
                
                stream.on("data", (chunk: Buffer) => {
                    stringbuff += Buffer.from(chunk);
                });
                
                stream.on("end", async () => {
                    const parsed = await simpleParser(stringbuff);
                    
                    const sender = session.envelope.mailFrom ? session.envelope.mailFrom.address : undefined;
                    const rcpt   = session.envelope.rcptTo.map(rcpt => rcpt.address)[0];
                    
                    //if sender/rcpt are not set
                    if(!sender || !rcpt) {
                        return callback(new Error("Invalid envelope (nullish sender or rcpt)"));
                    }
                    
                    //create a new email and send it to the listener
                    const email = new Email(sender, rcpt, parsed.subject || "[no subject]", parsed.text || "[email has empty or invalid body]", Date.now(), session.remoteAddress);
                    listener(email);
                });
                
            }
        });
        
        //listen
        this.server.listen(port, () => {
            console.log(`Email server listening on port ${port}`);
        });
        
    }
    
}
