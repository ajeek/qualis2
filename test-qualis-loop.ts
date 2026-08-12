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
    const total = Number((stats as any).total_evaluations);
    console.log("Total evaluations:", total);
    
    for (let i = total - 1; i >= 0; i--) {
      console.log(`Calling get_evaluation(${i})...`);
      const evalData = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_evaluation",
        args: [BigInt(i)],
      });
      console.log(`Got eval ${i}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
run();
