import Email from "./entity/Email";
import {SMTPServer, SMTPServerDataStream, SMTPServerSession} from "smtp-server";
import {simpleParser} from "mailparser";
import Config from "./Config";

export default class EmailServer {
    
    private server: SMTPServer;
    
    public constructor(port: number, listener: (email: Email) => any) {
        this.server = new SMTPServer({
            name: Config.SERVER_NAME,
            secure: false,
            authOptional: true,
            sessionTimeout: 20,
            size: 1048576,
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
                    
                    if(!sender || !rcpt) {
                        return callback(new Error("Invalid envelope (nullish sender or rcpt)"));
                    }
                    
                    const email = new Email(sender, rcpt, parsed.subject || "[no subject]", parsed.text || "[email has empty or invalid body]", Date.now(), session.remoteAddress);
                    
                    listener(email);
                });
                
            }
        });
        
        this.server.listen(port, () => {
            console.log(`Email server listening on port ${port}`);
        });
        
    }
    
    public setName(name: string) {
        this.server.options.name = name;
    }
    
}
