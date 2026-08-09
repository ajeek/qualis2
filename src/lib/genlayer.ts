import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

/**
 * Contract address must be supplied via environment variable.
 * The application refuses to start without it.
 */
const rawAddress = import.meta.env.VITE_QUALIS_CONTRACT_ADDRESS;

let CONTRACT_ADDRESS: `0x${string}` = rawAddress as `0x${string}`;

if (!rawAddress) {
  console.warn(
    "Developer Configuration Missing: " +
    "Please configure VITE_QUALIS_CONTRACT_ADDRESS for the target Studionet deployment."
  );
  CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
} else if (
  typeof rawAddress !== "string" ||
  !rawAddress.startsWith("0x") ||
  rawAddress.length !== 42
) {
  console.warn(
    "Invalid contract address format in VITE_QUALIS_CONTRACT_ADDRESS. " +
    "Expected a 42-character hex string starting with 0x."
  );
  CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
}

/**
 * Read client — talks directly to GenLayer RPC, no wallet required.
 * Used for all view-method calls and transaction status polling.
 */
export const READ_CLIENT = createClient({
  chain: studionet,
});

/**
 * Create a write client signed by the user's injected wallet.
 */
export function createWriteClient(
  address: `0x${string}`,
  provider: unknown
) {
  return createClient({
    chain: studionet,
    account: address,
    provider: provider as any,
  });
}

export { studionet, TransactionStatus, CONTRACT_ADDRESS };
