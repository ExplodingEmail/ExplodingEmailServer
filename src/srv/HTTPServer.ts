import {IncomingMessage, Server, ServerResponse} from "http";
import {readFileSync} from "fs";

export default class HTTPServer {
    
    public readonly http_server: Server;
    
    /**
     * Constructor
     * @param port {number}
     */
    public constructor(
        public readonly port: number
    ) {
        this.http_server = new Server((req, res) => {
            HTTPServer.onRequest(req, res);
        });
    }
    
    /**
     * On request.
     * 
     * @param req {IncomingMessage}
     * @param res {ServerResponse}
     * @private
     */
    private static onRequest(req: IncomingMessage, res: ServerResponse) {
        //if the user is connecting to the onion URL, send the minimal exploding email site.
        if(req.headers.host === "ttqp5vp3ylxrhpnfkehpzsslabaa7qxdur255jxgwmiisshv2wdntkid.onion") {
            res.writeHead(200, {
                "Content-Type": "text/html",
            });
            res.end(readFileSync("minimal.html").toString());
        } else {
            //else redirect to the normal url.
            res.writeHead(302, {
                "Location": "https://exploding.email",
            });
            res.end();
        }
    }
    
    
    /**
     * Start the HTTP server.
     */
    public start() {
        this.http_server.listen(this.port);
    }
    
}
