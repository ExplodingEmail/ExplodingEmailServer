
import {Webhook} from "discord-webhook-node";
import {readFileSync} from "fs";

import GetStats from "../db/GetStats";

export default function() {
    try {
        const url = readFileSync("./webhook_url.txt", "utf8");
        
        const hook = new Webhook({
            url: url,
        });
        
        const stats = new GetStats();
        
        let old_stats = 0;
        
        //send a message to the discord webhook every 10 minutes
        setInterval(async () => {
            const new_stats = await stats.getStats();
            const diff = new_stats - old_stats;
            old_stats = new_stats;
            await hook.send(`${diff} emails sent since last check`);
        }, 600000);
    } catch(e) {
        console.warn("Discord webhook disabled.");
    }
}
