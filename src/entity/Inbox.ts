/**
 * Describes an inbox.
 */
export default class Inbox {
    
    /**
     * Constructor.
     * 
     * @param address {string} the address of the inbox
     * @param token {string} the resume token.
     */
    public constructor(
        public readonly address: string,
        public readonly token: string,
    ) {}
    
}
