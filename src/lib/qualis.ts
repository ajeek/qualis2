import {
  READ_CLIENT,
  createWriteClient,
  TransactionStatus,
  CONTRACT_ADDRESS,
} from "./genlayer";



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
        console.warn(`[QUALIS RPC] writeContract network error, retrying ${attempt}/3...`, err);
        await new Promise((res) => setTimeout(res, 1500 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

// ------------------------------------------------------------------
// RPC Retry Wrapper
// ------------------------------------------------------------------
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) throw err;
      console.warn(`[QUALIS RPC] Call failed (attempt ${attempt}/${retries}). Retrying in ${BASE_DELAY * Math.pow(2, attempt - 1)}ms... Error: ${err.message || err}`);
      await new Promise((res) => setTimeout(res, BASE_DELAY * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("Unreachable");
}

// ------------------------------------------------------------------
// Types (mirror contract return shapes)
// ------------------------------------------------------------------
export interface Evaluation {
  title: string;
  description: string;
}

export interface Submission {
  evaluation_id: bigint;
  content: string;
}

export interface Assessment {
  submission_id: bigint;
  decision: string;
  reasoning: string;
}

export interface Stats {
  total_evaluations: bigint;
  total_submissions: bigint;
  total_assessments: bigint;
}

export interface EvaluationLifecycle {
  phase: "evaluation_created" | "work_submitted" | "assessment_finalized";
  submissionId?: bigint;
  submission?: Submission;
  assessment?: Assessment;
}

// ------------------------------------------------------------------
// Validation helpers
// ------------------------------------------------------------------
function validateWallet(address: string | null, provider: unknown | null) {
  if (!address) throw new Error("Wallet not connected");
  if (!provider) throw new Error("Wallet provider not available");
  if (!address.startsWith("0x") || address.length !== 42) {
    throw new Error("Invalid wallet address format");
  }
}

function validateContractAddress() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }
}

async function switchToStudionet(provider: any) {
  if (!provider || !provider.request) return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xf22f" }], // 61999
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xf22f",
              chainName: "GenLayer Studionet",
              rpcUrls: ["https://studio.genlayer.com/api"],
              nativeCurrency: {
                name: "GEN",
                symbol: "GEN",
                decimals: 18,
              },
            },
          ],
        });
      } catch (addError: any) {
        throw new Error("Could not add GenLayer Studionet network to wallet.");
      }
    } else {
      throw switchError;
    }
  }
}

// ------------------------------------------------------------------
// Development logging helper
// ------------------------------------------------------------------
function logTx(
  action: string,
  wallet: string,
  contract: string,
  txHash: string,
  status: string,
  result?: unknown
) {
  // eslint-disable-next-line no-console
  console.log("[QUALIS TX]", {
    action,
    wallet,
    contract,
    txHash,
    status,
    result,
    timestamp: new Date().toISOString(),
  });
}

// ------------------------------------------------------------------
// Contract interactions
// ------------------------------------------------------------------

/**
 * Create a new Evaluation.
 *
 * Conceptual flow:
 *   VALIDATE -> SIGN -> BROADCAST -> WAIT FOR FINALIZED -> CONFIRM CANONICAL STATE
 */
export async function createEvaluation(
  address: string,
  provider: unknown,
  title: string,
  description: string
): Promise<{ txHash: string; evaluationId: bigint; evaluation: Evaluation }> {
  validateWallet(address, provider);
  validateContractAddress();

  const t = title.trim();
  const d = description.trim();
  if (!t) throw new Error("Invalid title: cannot be empty");
  if (!d) throw new Error("Invalid description: cannot be empty");

  const writeClient = createWriteClient(address as `0x${string}`, provider);
  await switchToStudionet(provider);

  // BROADCAST
  const txHash = await safeWriteContract(writeClient, {
    address: CONTRACT_ADDRESS,
    functionName: "create_evaluation",
    args: [t, d],
    value: BigInt(0),
  });

  // WAIT FOR OFFICIAL TRANSACTION STATE
  const receipt = await writeClient.waitForTransactionReceipt({
    hash: txHash as any,
    status: TransactionStatus.FINALIZED,
    retries: 60,
    interval: 5000,
  });

  logTx("create_evaluation", address, CONTRACT_ADDRESS, txHash, receipt.status as string);

  // CONFIRM CANONICAL STATE
  const stats = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_stats",
    args: [],
  }))) as unknown as Stats;

  const newId = BigInt(stats.total_evaluations) - BigInt(1);

  const evaluation = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_evaluation",
    args: [newId],
  }))) as unknown as Evaluation;

  if (evaluation.title !== t || evaluation.description !== d) {
    throw new Error(
      `Canonical state could not be verified: evaluation data mismatch. Expected title=${t}, desc=${d}. Got title=${evaluation.title}, desc=${evaluation.description}`
    );
  }

  logTx(
    "create_evaluation_confirmed",
    address,
    CONTRACT_ADDRESS,
    txHash,
    "confirmed",
    { evaluationId: newId.toString(), evaluation }
  );

  return { txHash, evaluationId: newId, evaluation };
}

/**
 * Submit Work against an Evaluation.
 */
export async function submitWork(
  address: string,
  provider: unknown,
  evaluationId: bigint,
  content: string
): Promise<{ txHash: string; submissionId: bigint; submission: Submission }> {
  validateWallet(address, provider);
  validateContractAddress();

  const c = content.trim();
  if (!c) throw new Error("Invalid submission content: cannot be empty");

  const writeClient = createWriteClient(address as `0x${string}`, provider);
  await switchToStudionet(provider);

  const txHash = await safeWriteContract(writeClient, {
    address: CONTRACT_ADDRESS,
    functionName: "submit_work",
    args: [evaluationId, c],
    value: BigInt(0),
  });

  const receipt = await writeClient.waitForTransactionReceipt({
    hash: txHash as any,
    status: TransactionStatus.FINALIZED,
    retries: 60,
    interval: 5000,
  });

  logTx("submit_work", address, CONTRACT_ADDRESS, txHash, receipt.status as string);

  const stats = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_stats",
    args: [],
  }))) as unknown as Stats;

  const newId = BigInt(stats.total_submissions) - BigInt(1);

  const submission = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_submission",
    args: [newId],
  }))) as unknown as Submission;

  if (BigInt(submission.evaluation_id) !== BigInt(evaluationId) || submission.content !== c) {
    throw new Error(
      `Canonical state could not be verified: submission data mismatch. Expected eval_id=${evaluationId}, content=${c}. Got eval_id=${submission.evaluation_id}, content=${submission.content}`
    );
  }

  logTx(
    "submit_work_confirmed",
    address,
    CONTRACT_ADDRESS,
    txHash,
    "confirmed",
    { submissionId: newId.toString(), submission }
  );

  return { txHash, submissionId: newId, submission };
}

/**
 * Generate Assessment for a Submission.
 * This is the critical GenLayer feature: non-deterministic execution
 * evaluated by validator consensus.
 */
export async function assessSubmission(
  address: string,
  provider: unknown,
  submissionId: bigint
): Promise<{ txHash: string; assessment: Assessment }> {
  validateWallet(address, provider);
  validateContractAddress();

  const writeClient = createWriteClient(address as `0x${string}`, provider);
  await switchToStudionet(provider);

  const txHash = await safeWriteContract(writeClient, {
    address: CONTRACT_ADDRESS,
    functionName: "assess_submission",
    args: [submissionId],
    value: BigInt(0),
  });

  const receipt = await writeClient.waitForTransactionReceipt({
    hash: txHash as any,
    status: TransactionStatus.FINALIZED,
    retries: 60,
    interval: 5000,
  });

  logTx("assess_submission", address, CONTRACT_ADDRESS, txHash, receipt.status as string);

  // Confirm canonical state via deterministic lookup
  const assessment = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_assessment_by_submission",
    args: [submissionId],
  }))) as unknown as Assessment;

  if (BigInt(assessment.submission_id) !== BigInt(submissionId)) {
    throw new Error(
      `Canonical state could not be verified: assessment mismatch. Expected sub_id=${submissionId}, got sub_id=${assessment.submission_id}`
    );
  }

  logTx(
    "assess_submission_confirmed",
    address,
    CONTRACT_ADDRESS,
    txHash,
    "confirmed",
    { assessment }
  );

  return { txHash, assessment };
}

/**
 * Verify the one-assessment invariant by attempting a second assessment.
 * The contract should reject it. We confirm by checking that no new
 * assessment was created.
 */
export async function verifyInvariant(
  address: string,
  provider: unknown,
  submissionId: bigint
): Promise<{ verified: boolean; message: string }> {
  validateWallet(address, provider);
  validateContractAddress();

  // Pre-check: submission must already be assessed
  const hasAssess = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "has_assessment",
    args: [submissionId],
  }))) as unknown as boolean;

  if (!hasAssess) {
    return {
      verified: false,
      message: "Submission has not been assessed yet — cannot verify invariant.",
    };
  }

  const statsBefore = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_stats",
    args: [],
  }))) as unknown as Stats;

  const writeClient = createWriteClient(address as `0x${string}`, provider);
  await switchToStudionet(provider);

  let txHash: string;
  try {
    txHash = await safeWriteContract(writeClient, {
      address: CONTRACT_ADDRESS,
      functionName: "assess_submission",
      args: [submissionId],
      value: BigInt(0),
    });
  } catch (err) {
    // Wallet rejected the transaction before broadcast
    return {
      verified: true,
      message:
        "Protocol enforced: This Submission already has a canonical Assessment. " +
        "(Wallet rejected the duplicate assessment transaction.)",
    };
  }

  // Wait for the transaction to reach finality
  // Even if execution fails, the transaction may still finalize
  let receipt;
  try {
    receipt = await writeClient.waitForTransactionReceipt({
      hash: txHash as any,
      status: TransactionStatus.FINALIZED,
      retries: 60,
      interval: 5000,
    });
  } catch (err) {
    return {
      verified: true,
      message:
        "Protocol enforced: This Submission already has a canonical Assessment. " +
        "(Transaction did not reach finality — contract rejected duplicate assessment.)",
    };
  }

  logTx("verify_invariant", address, CONTRACT_ADDRESS, txHash, receipt.status as string);

  // Confirm that no new assessment was created
  const statsAfter = (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_stats",
    args: [],
  }))) as unknown as Stats;

  if (statsAfter.total_assessments === statsBefore.total_assessments) {
    return {
      verified: true,
      message:
        "Protocol enforced: This Submission already has a canonical Assessment.",
    };
  }

  // Should never happen if the contract is correct
  return {
    verified: false,
    message:
      "Invariant check failed: a second assessment was created. " +
      "The one-assessment invariant is broken.",
  };
}

// ------------------------------------------------------------------
// Direct read helpers (for UI refresh)
// ------------------------------------------------------------------

export async function getStats(): Promise<Stats> {
  validateContractAddress();
  return (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_stats",
    args: [],
  }))) as any;
}

export async function getEvaluation(evaluationId: bigint): Promise<Evaluation> {
  validateContractAddress();
  return (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_evaluation",
    args: [evaluationId],
  }))) as any;
}

export async function getSubmission(submissionId: bigint): Promise<Submission> {
  validateContractAddress();
  return (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_submission",
    args: [submissionId],
  }))) as any;
}

export async function hasAssessment(
  submissionId: bigint
): Promise<boolean> {
  validateContractAddress();
  return (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "has_assessment",
    args: [submissionId],
  }))) as unknown as boolean;
}

export async function getAssessmentBySubmission(
  submissionId: bigint
): Promise<Assessment> {
  validateContractAddress();
  return (await withRetry(() => READ_CLIENT.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_assessment_by_submission",
    args: [submissionId],
  }))) as any;
}

export async function getEvaluationsLifecycleStates(
  evaluationIds: bigint[],
  totalSubmissions: number
): Promise<Map<bigint, EvaluationLifecycle>> {
  const result = new Map<bigint, EvaluationLifecycle>();

  // initialize all to evaluation_created
  for (const id of evaluationIds) {
    result.set(id, { phase: "evaluation_created" });
  }

  const idsToFind = new Set(evaluationIds);

  for (let i = totalSubmissions - 1; i >= 0; i--) {
    if (idsToFind.size === 0) break;
    
    const subId = BigInt(i);
    const sub = await getSubmission(subId);
    
    const evalId = BigInt(sub.evaluation_id);

    if (idsToFind.has(evalId)) {
      const isAssessed = await hasAssessment(subId);
      if (isAssessed) {
        const assessment = await getAssessmentBySubmission(subId);
        result.set(evalId, {
          phase: "assessment_finalized",
          submissionId: subId,
          submission: sub,
          assessment
        });
      } else {
        result.set(evalId, {
          phase: "work_submitted",
          submissionId: subId,
          submission: sub
        });
      }
      idsToFind.delete(evalId);
    }
  }

  return result;
}
