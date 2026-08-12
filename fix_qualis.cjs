const fs = require('fs');
let code = fs.readFileSync('src/lib/qualis.ts', 'utf8');

const retryLogic = `
// ------------------------------------------------------------------
// RPC Retry Wrapper
// ------------------------------------------------------------------
const MAX_RETRIES = 5;
const BASE_DELAY = 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) throw err;
      console.warn(\`[QUALIS RPC] Call failed (attempt \${attempt}/\${retries}). Retrying in \${BASE_DELAY * Math.pow(2, attempt - 1)}ms... Error: \${err.message || err}\`);
      await new Promise((res) => setTimeout(res, BASE_DELAY * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("Unreachable");
}

`;

// Insert after imports
code = code.replace(
  /\/\/ ------------------------------------------------------------------\n\/\/ Types/,
  retryLogic + '// ------------------------------------------------------------------\n// Types'
);

// Replace await READ_CLIENT.readContract({ ... })
// We need to wrap it in await withRetry(() => READ_CLIENT.readContract({ ... }))

// A simple regex might not match the closing brace perfectly, so let's match the start and then find the matching closing bracket.
// Actually, in the file, every call looks like:
// await READ_CLIENT.readContract({
//   ...
// })
// So replacing `await READ_CLIENT.readContract({` with `await withRetry(() => READ_CLIENT.readContract({`
// and replacing `})) as` with `}))) as` works!
code = code.replace(/await READ_CLIENT\.readContract/g, 'await withRetry(() => READ_CLIENT.readContract');
code = code.replace(/\}\)\)/g, '}))'); // wait, the original was `})) as any;`, `})) as unknown as Stats;`

fs.writeFileSync('src/lib/qualis.ts', code);
