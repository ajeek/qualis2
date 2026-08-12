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

    console.log("Calling get_evaluation(0)...");
    const eval0 = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_evaluation",
      args: [0n],
    });
    console.log("Evaluation 0:", eval0);

    console.log(`Calling get_evaluation(${total - 1})...`);
    const evalLast = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_evaluation",
      args: [BigInt(total - 1)],
    });
    console.log(`Evaluation ${total - 1}:`, evalLast);

    console.log("Simulating 11 calls for first StrictMode run...");
    for (let i = total - 1; i >= Math.max(0, total - 10); i--) {
        await client.readContract({
            address: CONTRACT_ADDRESS,
            functionName: "get_evaluation",
            args: [BigInt(i)],
        });
        process.stdout.write(".");
    }
    console.log("\nSimulating 11 calls for second StrictMode run...");
    for (let i = total - 1; i >= Math.max(0, total - 10); i--) {
        await client.readContract({
            address: CONTRACT_ADDRESS,
            functionName: "get_evaluation",
            args: [BigInt(i)],
        });
        process.stdout.write(".");
    }
    
    console.log("\nAll succeeded.");

  } catch (error) {
    console.error("\nError:", error);
  }
}
run();
