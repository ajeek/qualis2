# Qualis

## GenLayer-Native Evaluation Protocol

Qualis turns an evaluation into **canonical protocol state**.

A user creates an **Evaluation** with explicit criteria, submits **Work** against it, and invokes GenLayer's **non-deterministic execution** to produce an **Assessment**. Validator consensus determines the canonical result, which is then stored by the Intelligent Contract.

**Evaluation → Work → Assessment → Canonical Protocol State**

Qualis demonstrates a specific capability of GenLayer: **evaluating information that cannot be resolved by deterministic smart-contract execution alone, while keeping the resulting decision inside protocol state.**

---

## Links

**GitHub:** https://github.com/ajeek/qualis2

**Live Application:** https://thequalis.vercel.app/

**Intelligent Contract:** `0xC729B58f80111972028d0214f07A6AA9dA68ed6c`

---

## What Qualis Does

Qualis implements a simple evaluation lifecycle:

1. **Create Evaluation**  
   Define a title and evaluation criteria.

2. **Submit Work**  
   Submit content against those criteria.

3. **Generate Assessment**  
   The Intelligent Contract evaluates the submission through GenLayer's **non-deterministic execution**.

4. **Canonical Assessment**  
   Validator consensus produces the canonical decision and reasoning.

5. **Verify Invariant**  
   A second assessment attempt demonstrates that the Intelligent Contract prevents a Submission from receiving another canonical Assessment.

The frontend reflects the actual protocol lifecycle rather than simulating results locally.

---

## Why GenLayer

A conventional deterministic smart contract can store an evaluation and a submission, but it cannot natively resolve questions whose answers depend on **non-deterministic information processing**.

Qualis uses GenLayer's execution model for that part of the protocol.

The boundary is:

### Deterministic Protocol State

- Evaluation criteria
- Submitted Work
- Assessment records
- Assessment status
- Submission state

### Non-Deterministic Execution

- Evaluating Work against Evaluation criteria
- Validator comparison of the resulting decision

The resulting Assessment is persisted as **canonical Intelligent Contract state**.

This is the core reason Qualis uses GenLayer rather than a conventional smart contract connected to an external evaluation service.

---

## Protocol Architecture

```text
                 ┌──────────────────┐
                 │    Evaluation    │
                 │ criteria + title │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │       Work       │
                 │    submission    │
                 └────────┬─────────┘
                          │
                          ▼
              ┌──────────────────────────┐
              │ GenLayer                 │
              │ Non-Deterministic        │
              │ Execution                │
              └────────────┬─────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │    Assessment    │
                 │ decision +       │
                 │ reasoning        │
                 └────────┬─────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Canonical Protocol      │
              │ State                   │
              └─────────────────────────┘
```

---

## Intelligent Contract

The core contract is:

`contract/qualis.py`

### Core Storage

The contract maintains:

```text
DynArray[Evaluation] evaluations
DynArray[Submission] submissions
DynArray[Assessment] assessments
DynArray[bool] submission_assessed
```

### Lifecycle Methods

| Method | Type | Purpose |
|---|---|---|
| `create_evaluation` | Write | Creates an Evaluation |
| `submit_work` | Write | Creates a Submission |
| `assess_submission` | Write | Executes the non-deterministic assessment |
| `get_evaluation` | View | Reads Evaluation data |
| `get_submission` | View | Reads Submission data |
| `get_assessment_by_submission` | View | Reads the canonical Assessment |
| `has_assessment` | View | Checks whether a Submission is already assessed |
| `get_stats` | View | Returns protocol counts |

---

## Assessment and Consensus

`assess_submission` is the GenLayer-specific part of Qualis.

The contract:

1. Verifies that the Submission exists and has not already been assessed.
2. Loads the Evaluation criteria and submitted Work.
3. Executes the evaluation through GenLayer's **non-deterministic execution**.
4. Uses validator execution to compare the resulting decision.
5. Persists the resulting Assessment.
6. Marks the Submission as assessed.

The frontend does not generate or fabricate the Assessment.

After the transaction reaches `FINALIZED`, the frontend reads the Assessment from the Intelligent Contract and displays it as **Canonical Protocol State**.

---

## One-Assessment Invariant

Each Submission can have only **one canonical Assessment**.

The Intelligent Contract enforces this invariant:

```python
if self.submission_assessed[submission_id]:
    raise UserError("Submission already assessed")
```

Qualis exposes **Verify Invariant** to demonstrate this behavior.

The verification flow is:

```text
Existing Assessment
        |
        v
Attempt second assessment
        |
        v
Contract rejects duplicate
        |
        v
No second Assessment created
```

A wallet rejection, RPC failure, timeout, or transaction that does not reach finality is **not** treated as proof of contract enforcement.

---

## Frontend

Qualis uses React for the application interface.

```text
src/
├── App.tsx
├── main.tsx
├── index.css
└── lib/
    ├── genlayer.ts
    └── qualis.ts
```

### `src/lib/genlayer.ts`

Handles GenLayer client initialization, network configuration, and environment validation.

### `src/lib/qualis.ts`

Contains the contract interaction layer and transaction lifecycle handling.

### `src/App.tsx`

Manages the protocol lifecycle UI, application state, and wallet interaction.

The frontend uses finalized transaction state and canonical contract reads rather than inventing protocol results.

---

## Transaction Lifecycle

Every protocol write follows:

```text
Validate prerequisites
        |
        v
Wallet signature
        |
        v
Broadcast transaction
        |
        v
Wait for FINALIZED
        |
        v
Read canonical contract state
        |
        v
Update UI
```

Transaction hashes are stored independently for each lifecycle stage:

- `evaluationTxHash`
- `submissionTxHash`
- `assessmentTxHash`

This keeps the complete transaction lifecycle visible and auditable from the interface.

---

## Running Qualis

### Requirements

- Node.js
- An EIP-1193 compatible wallet such as MetaMask or Rabby
- A funded GenLayer Studionet wallet
- GEN tokens for transaction fees

### Install

```bash
npm install
```

Create `.env` from `.env.example` and configure:

```env
VITE_QUALIS_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

Start the development server:

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

---

## Studionet

Qualis currently targets **GenLayer Studionet**.

| Parameter | Value |
|---|---|
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| Currency | `GEN` |
| RPC | `https://studio.genlayer.com/api` |

Deploy the Intelligent Contract through GenLayer Studio and place the resulting contract address in the environment configuration.

The current deployed contract is:

```text
0xC729B58f80111972028d0214f07A6AA9dA68ed6c
```

---

## Demo

A complete Qualis demonstration follows this lifecycle:

```text
Create Evaluation
        |
        v
Submit Work
        |
        v
Generate Assessment
        |
        v
Canonical Assessment
        |
        v
Verify Invariant
```

### Example Evaluation

**Title**

`Best Team Wins`

**Criteria**

> Team 1 through Team 5 compete; the submission should identify the winning team.

### Example Work

> Team 1 wins.

### Assessment

The Intelligent Contract produces an **APPROVED** or **REJECTED** decision with reasoning through GenLayer's **non-deterministic execution**.

### Invariant

Attempting to assess the same Submission again results in the Intelligent Contract rejecting the duplicate assessment.

---

## Known Limitations

### ID Derivation

The frontend derives newly created IDs from the finalized protocol count:

```text
newId = totalCount - 1
```

This is suitable for the demonstration workflow.

Concurrent creators could potentially race and observe the wrong newly-created ID. A production implementation would use a stronger user-specific or transaction-bound ID retrieval strategy.

### Studionet Availability

Studionet is a hosted development environment. RPC availability and rate limits can affect reads, transaction submission, and finality.

### Assessment Output

The assessment depends on GenLayer's non-deterministic execution producing the expected structured result. Invalid or malformed execution output can cause an assessment transaction to fail.

---

## Built With

- **GenLayer Intelligent Contracts**
- **GenLayer non-deterministic execution**
- **GenLayer Studionet**
- **genlayer-js**
- **React**
- **TypeScript**
- **Vite**

---

## License

**MIT License**