import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({
  chain: studionet,
});

const CONTRACT_ADDRESS = "0x5694E827BB8FdcFCA3bce068B73DBf024205B563";

async function run() {
  try {
    console.log("Calling get_stats...");
    const stats = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_stats",
      args: [],
    });
    console.log("Stats:", stats);
    
    const total = Number((stats as any).total_evaluations);
    console.log("Total evaluations:", total);
    
    if (total > 0) {
      console.log("Calling get_evaluation(0)...");
      const evalData = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_evaluation",
        args: [0n],
      });
      console.log("Evaluation 0:", evalData);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
run();
