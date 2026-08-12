import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import fs from 'fs';

const client = createClient({
  chain: studionet,
});

const CONTRACT_ADDRESS = "0x5694E827BB8FdcFCA3bce068B73DBf024205B563";

async function run() {
  try {
    const r = await fetch("https://studio.genlayer.com/api", {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      }
    });
    console.log("OPTIONS status:", r.status);
    console.log("OPTIONS headers:", Object.fromEntries(r.headers.entries()));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
