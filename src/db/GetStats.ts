
import {createClient} from "redis";

export default class GetStats {
    
    private client = createClient();
    
    constructor() {
        this.client.connect().then(() => {
            console.log("Connected to Redis");
        });
    }
    
    public async getStats(): Promise<number> {
        return parseInt(await this.client.GET("exp-stats") || "0");
    }
    
    public async incrementStats(): Promise<void> {
        await this.client.INCR("exp-stats");
    }
    
}
