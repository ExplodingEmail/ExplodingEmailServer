
/**
 * Email entity
 */
export default class Email {
    
    /**
     * Email constructor.
     * 
     * @param from {string} the sender.
     * @param to {string} the recipient.
     * @param subject {string} the subject.
     * @param body {string} the body.
     * @param date {number} the date in unix millis.
     * @param ip {string} the ip address sending the email.
     */
    public constructor(
        public readonly from: string,
        public readonly to: string,
        public readonly subject: string,
        public readonly body: string,
        public readonly date: number,
        public readonly ip: string,
    ) {}
}
