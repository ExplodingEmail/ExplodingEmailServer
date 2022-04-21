
import {readFileSync} from "fs";

export default class Config {
    
    //ports for smtp/ws
    public static readonly SMTP_PORT = 2525;
    public static readonly WS_PORT = 8099;
    
    //inbox expiration time in seconds (default: 3 hours)
    public static readonly INBOX_EXPIRATION = 10800;
    
    public static readonly URIS = [
        "theeyeoftruth.com",
        "magicaljellyfish.com",
    ];
    
    //response to send on 220 and 250
    public static readonly SERVER_NAME = "Some Assembly Required";
    
    //version
    public static readonly VERSION = JSON.parse(readFileSync("./package.json").toString()).version;
    
}
