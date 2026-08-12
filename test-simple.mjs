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
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
