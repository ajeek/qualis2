import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({
  chain: studionet,
});

const CONTRACT_ADDRESS = "0x5694E827BB8FdcFCA3bce068B73DBf024205B563";

async function run() {
  try {
    for (let i = 25; i >= 0; i--) {
       console.log("Fetching", i);
       const evalData = await client.readContract({
         address: CONTRACT_ADDRESS,
         functionName: "get_evaluation",
         args: [BigInt(i)],
       });
       console.log("Got", i);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
