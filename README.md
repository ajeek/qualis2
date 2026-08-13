# Qualis: GenLayer Native Evaluation Protocol

Qualis demonstrates why GenLayer is necessary. 
A user creates an **Evaluation** with criteria. 
A user submits **Work** against it. 
GenLayer invokes **non-deterministic execution** to evaluate the Work. 
Validator consensus makes the **Assessment** canonical protocol state.

```
Evaluation → Work → Assessment → Canonical Protocol State
```

---

## Table of Contents

1. [What Qualis Is](#what-qualis-is)
2. [Why GenLayer Is Required](#why-genlayer-is-required)
3. [Contract Architecture](#contract-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Transaction Lifecycle](#transaction-lifecycle)
6. [Non-Deterministic Execution](#non-deterministic-execution)
7. [Canonical Protocol State](#canonical-protocol-state)
8. [One-Assessment Invariant](#one-assessment-invariant)
9. [Studionet Setup](#studionet-setup)
10. [Contract Deployment](#contract-deployment)
11. [Environment Configuration](#environment-configuration)
12. [Frontend Deployment](#frontend-deployment)
13. [Demo Instructions](#demo-instructions)
14. [Known Limitations](#known-limitations)

---

## What Qualis Is

Qualis is a protocol, not a generic AI app. It proves that a blockchain can:

1. Store deterministic criteria (Evaluation)
2. Accept deterministic input (Work)
3. Execute non-deterministic evaluation (Assessment)
4. Reach validator consensus on the result
5. Make that result canonical, immutable protocol state

The frontend makes this lifecycle obvious without becoming a dashboard of meaningless metrics.

---

## Why GenLayer Is Required

Traditional smart contracts are deterministic. They cannot evaluate whether a blog post is "good" or a design is "on-brand." GenLayer adds:

- **Non-deterministic execution** via LLM calls inside the contract
- **Validator consensus** via custom equivalence principles
- **Canonical on-chain results** that are as final as any other transaction

Without GenLayer, this protocol would require an off-chain oracle, breaking the chain of trust. With GenLayer, the evaluation happens inside the consensus layer.

---

## Contract Architecture

```python
# Core storage
DynArray[Evaluation] evaluations      # 0-indexed
DynArray[Submission] submissions      # 0-indexed
DynArray[Assessment] assessments      # 0-indexed
DynArray[bool] submission_assessed    # parallel to submissions
```

### Lifecycle Methods

| Method | Type | Purpose |
|--------|------|---------|
| `create_evaluation(title, description)` | Write | Creates an Evaluation |
| `submit_work(evaluation_id, content)` | Write | Creates a Submission |
| `assess_submission(submission_id)` | Write | **Non-deterministic execution** |
| `get_evaluation(id)` | View | Read Evaluation |
| `get_submission(id)` | View | Read Submission |
| `get_assessment_by_submission(id)` | View | Read Assessment by Submission |
| `has_assessment(id)` | View | Check invariant |
| `get_stats()` | View | Totals for ID derivation |

### ID Model

- **0-indexed.** The first Evaluation is ID `0`.
- The contract appends to `DynArray`. ID = `len(array) - 1`.
- The frontend never assumes IDs. It always derives them from `get_stats()` after finalization.

---

## Frontend Architecture

```
src/
  lib/
    genlayer.ts    # Client init, env validation, network config
    qualis.ts      # All contract interactions, transaction lifecycle
  App.tsx          # UI state machine, wallet flow, protocol steps
  main.tsx         # React entry
  index.css        # Tailwind + minimal custom styles
```

### State Machine

The UI is driven by a strict phase machine:

```
disconnected → connecting → connected → ready
  → creating_evaluation → evaluation_created → ready_for_submission
  → submitting_work → work_submitted → ready_for_assessment
  → assessing → assessment_finalized
  → verifying_invariant → invariant_verified / invariant_rejected
```

No fake telemetry. No invented percentages. Only real observable states.

---

## Transaction Lifecycle

Every write transaction follows this exact flow:

```
VALIDATE prerequisites (wallet, address, provider, network, contract)
→ SIGN via wallet popup
→ BROADCAST (writeContract returns tx hash only)
→ WAIT FOR OFFICIAL STATE (waitForTransactionReceipt to FINALIZED)
→ CONFIRM CANONICAL STATE (readContract view methods)
→ UPDATE UI
```

**Critical rules:**
- `writeContract` returns **only a transaction hash**. Never `receipt.data`.
- IDs are never inferred from transaction hashes.
- No `setTimeout` or arbitrary polling is used for correctness.
- If canonical state cannot be verified, the UI shows a real error.

---

## Non-Deterministic Execution

The `assess_submission` method is the core GenLayer feature:

1. **Verify** submission exists and is unassessed
2. **Load** evaluation criteria and work content into local variables
3. **Leader function** (`leader_fn`): constructs an LLM prompt, calls `gl.nondet.exec_prompt`, parses JSON
4. **Validator function** (`validator_fn`): receives `gl.vm.Result`, validates structure, independently re-runs the same LLM evaluation, compares only the `decision` field
5. **Consensus** via `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`
6. **Persist** the Assessment and mark submission as assessed

The frontend does not simulate this. It waits for the transaction to reach `FINALIZED` and then reads the canonical result.

---

## Canonical Protocol State

After `assess_submission` reaches `FINALIZED`:

1. The frontend calls `get_assessment_by_submission(submission_id)`
2. The contract returns the stored Assessment: `{decision, reasoning, submission_id}`
3. The UI displays this as **Canonical Protocol State**

This is the only source of truth. The frontend never fabricates, caches, or infers assessment data.

---

## One-Assessment Invariant

**Protocol invariant:** Each Submission can have only one canonical Assessment.

Enforced in the contract:

```python
if self.submission_assessed[submission_id]:
    raise UserError("Submission already assessed")
```

The frontend provides a **Verify Invariant** action that:
1. Checks `has_assessment(submission_id)` is `True`
2. Records `total_assessments` before the attempt
3. Calls `assess_submission` again
4. Confirms `total_assessments` did not increase
5. Displays: "Protocol enforced: This Submission already has a canonical Assessment."

---

## Studionet Setup

### Network Parameters

| Parameter | Value |
|-----------|-------|
| Network | GenLayer Studionet |
| RPC URL | `https://studio.genlayer.com/api` |
| Chain ID | `61999` |
| Currency | `GEN` |

### Wallet Setup

1. Install MetaMask, Rabby, or another EIP-1193 compatible wallet
2. The app will auto-switch to Studionet via `client.connect("studionet")`
3. If auto-switch fails, manually add the network with the parameters above
4. Fund your wallet with GEN tokens via the GenLayer Studio faucet

---

## Contract Deployment

1. Open [studio.genlayer.com](https://studio.genlayer.com)
2. Create a new contract
3. Paste the contents of `contract/qualis.py`
4. Deploy to **Studionet**
5. Copy the deployed contract address (42-character hex string starting with `0x`)

---

## Environment Configuration

Create a `.env` file in the project root:

```bash
VITE_QUALIS_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

**Requirements:**
- Must be a 42-character hex string starting with `0x`
- The app will refuse to start if this variable is missing or invalid
- Never hardcode the contract address in source code

---

## Frontend Deployment

### Local Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

The `dist/` folder contains the static build. Deploy it to Vercel, Netlify, GitHub Pages, or any static host.

### Vercel Deployment

```bash
npm run build
vercel --prod dist/
```

Or connect your Git repository to Vercel and set the build command to `npm run build` with output directory `dist`.

---

## Demo Instructions

### Complete Protocol Lifecycle

1. **Open** the application in your browser
2. **Connect Wallet** — MetaMask/Rabby popup appears
3. **Verify Studionet** — app switches network automatically
4. **Create Evaluation**
   - Title: "Best Technical Blog Post"
   - Description: "The post must explain a complex topic clearly, include code examples, and be under 2000 words."
   - Click **Create Evaluation**
   - Wait for `FINALIZED` status
   - Confirm: "Evaluation #0 Ready for Work"
5. **Submit Work**
   - Paste a blog post or any text
   - Click **Submit Work**
   - Wait for `FINALIZED` status
   - Confirm: "Submission #0 Ready for Assessment"
6. **Generate Assessment**
   - Click **Generate Assessment**
   - This invokes non-deterministic LLM execution
   - Wait for validator consensus (may take 30–120 seconds)
   - View **Canonical Protocol State**: APPROVED or REJECTED + reasoning
7. **Verify Invariant**
   - Click **Verify Invariant**
   - The contract rejects the duplicate assessment
   - Confirm: "Protocol enforced: This Submission already has a canonical Assessment."

### Expected Console Logs

```
[QUALIS TX] { action: "create_evaluation", wallet: "0x...", contract: "0x...", txHash: "0x...", status: "FINALIZED", ... }
[QUALIS TX] { action: "create_evaluation_confirmed", ..., result: { evaluationId: "0", evaluation: {...} } }
```

---

## Known Limitations

1. **ID concurrency race:** The `total - 1` ID retrieval strategy is safe for single-user demos but could race under concurrent creators. For a production deployment, a user-specific ID mapping would be needed.
2. **LLM prompt brittleness:** The evaluator prompt assumes the LLM returns valid JSON. Malformed responses will cause execution failures. The validator function catches structural mismatches.
3. **Network availability:** Studionet is a hosted environment. Downtime or rate limits may affect transaction finalization times.
4. **No live testing performed:** The build is verified for correctness against official GenLayer documentation. Live transaction execution requires a funded Studionet wallet and browser environment.

---

## Architecture Verification References

- GenLayerJS SDK: `genlayer-js` v1.1.8
- Official docs: [docs.genlayer.com](https://docs.genlayer.com)
- GenLayer Studio: [studio.genlayer.com](https://studio.genlayer.com)
- Transaction status enum: `PENDING`, `ACCEPTED`, `FINALIZED`, `UNDETERMINED`, `CANCELED`
- Write contract returns: `0x${string}` (transaction hash only)
- Network switch: `client.connect("studionet")`
- Non-deterministic execution: `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`

---

## License

MIT — Built for the GenLayer hackathon.
