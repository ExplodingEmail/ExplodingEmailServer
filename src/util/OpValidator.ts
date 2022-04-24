import OpCodes from "../enum/OpCodes";

/**
 * Validates OpCodes.
 */
export default class OpValidator {
    
    /**
     * Validates the given operation code.
     * @param op {number} The operation code to validate.
     * @param data {any} The data to validate.
     */
    public static validate(op: number, data: any): boolean {
        try {
            switch(op) {
                case OpCodes.DELETE_INBOX: {
                    return this.validateDeleteAddress(data);
                }
                default: {
                    return false;
                }
            }
        } catch(e) {
            return false;
        }
    }
    
    /**
     * Validate the DELETE_INBOX operation.
     * @param data {any} The data to validate.
     * @returns {boolean} True if the data is valid, false otherwise.
     * @private
     */
    private static validateDeleteAddress(data: any): boolean {
        //the data should have a `token` property
        if(!data.token) {
            return false;
        }
        //the token should be a string
        return typeof data.token === "string";
    }
    
}
