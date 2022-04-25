
import * as dns from "dns";
import * as crypto from "crypto";

export default class ValidateTextRecord {
    
    public constructor(
        public domain: string,
    ) {}
    
    private static sha512(data: string): string {
        return crypto.createHash("sha512").update(data).digest("hex");
    }
    
    public async hasKey(key: string): Promise<boolean> {
        try {
            //check the TXT records of the domain to see if the `_exploding` record exists and has a sha512 hash of the key
            const records = await dns.promises.resolveTxt("exploding-email." + this.domain);
            console.log(JSON.stringify(records));
            const record = records.find(record => record.includes(`${ValidateTextRecord.sha512(key)}`));
            return record !== undefined;
        } catch(e) {
            console.log(e);
            return false;
        }
    }
    
}
