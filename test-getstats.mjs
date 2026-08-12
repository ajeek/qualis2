import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({
  chain: studionet,
});

const CONTRACT_ADDRESS = "0x5694E827BB8FdcFCA3bce068B73DBf024205B563";

async function run() {
  try {
    const stats = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_stats",
      args: [],
    });
    console.log("Stats:", stats);
    console.log("Stats total_evaluations:", stats.total_evaluations);
    
    let total = Number(stats.total_evaluations);
    console.log("Total:", total);
    const minIndex = Math.max(0, total - 10);
    for (let i = total - 1; i >= minIndex; i--) {
       console.log("Looping", i);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
