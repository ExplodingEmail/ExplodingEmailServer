
/**
 * This is in the enum folder, but it is a class because
 * I need it to be numbers instead of constants.
 */
export default class OpCodes {
    public static readonly INVALID_TOKEN = 0;                //server -> client
    public static readonly GENERATION_FAILURE = 1;           //server -> client
    public static readonly HERE_IS_YOUR_EMAIL_AND_TOKEN = 2; //server -> client
    public static readonly STATISTICS_REQUEST_RESPONSE = 3;  //server -> client
    public static readonly INVALID_URI = 4;                  //server -> client
    public static readonly RESUME_SUCCESS = 5;               //server -> client
    public static readonly EMAIL_INCOMING = 6;               //server -> client
    public static readonly DELETE_SUCCESS = 7;               //server -> client
    public static readonly DELETE_FAILURE = 8;               //server -> client
    public static readonly INVALID_JSON = 9;                 //server -> client
    public static readonly DELETE_INBOX = 10;                //client -> server
    public static readonly INVALID_OPCODE = 11;              //server -> client
    public static readonly VERSION = 12;                     //server -> client
    public static readonly INBOX_EXPIRED = 13;               //server -> client
    public static readonly INVALID_KEY = 14;                 //server -> client
}
