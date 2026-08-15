const fs = require('fs');
let code = fs.readFileSync('src/lib/qualis.ts', 'utf8');

const retryFunc = `
async function safeWriteContract(writeClient: any, args: any): Promise<string> {
  let attempt = 0;
  while (attempt < 3) {
    try {
      return (await writeClient.writeContract(args)) as string;
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "";
      if (msg.includes("User rejected") || err?.code === 4001 || msg.includes("rejected in your wallet")) {
        throw err;
      }
      if (msg.includes("Failed to fetch") || msg.includes("fetch") || msg.includes("network")) {
        attempt++;
        if (attempt >= 3) throw err;
        console.warn(\`[QUALIS RPC] writeContract network error, retrying \${attempt}/3...\`, err);
        await new Promise((res) => setTimeout(res, 1500 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}
`;

code = code.replace('// ------------------------------------------------------------------', retryFunc + '\n// ------------------------------------------------------------------');

code = code.replace(/await writeClient\.writeContract\(\{/g, 'await safeWriteContract(writeClient, {');

fs.writeFileSync('src/lib/qualis.ts', code);
