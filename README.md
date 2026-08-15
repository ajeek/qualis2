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

**Deterministic protocol state**
- Evaluation criteria
- Submitted Work
- Assessment records
- Assessment status
- Submission state

**Non-deterministic execution**
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
Intelligent Contract

The core contract is contract/qualis.py.

Core Storage
DynArray[Evaluation] evaluations
DynArray[Submission] submissions
DynArray[Assessment] assessments
DynArray[bool] submission_assessed
Lifecycle Methods
Method	Type	Purpose
create_evaluation	Write	Creates an Evaluation
submit_work	Write	Creates a Submission
assess_submission	Write	Executes the non-deterministic assessment
get_evaluation	View	Reads Evaluation data
get_submission	View	Reads Submission data
get_assessment_by_submission	View	Reads the canonical Assessment
has_assessment	View	Checks whether a Submission is already assessed
get_stats	View	Returns protocol counts
Assessment and Consensus

assess_submission is the GenLayer-specific part of Qualis.

The contract:

Verifies that the Submission exists and has not already been assessed.
Loads the Evaluation criteria and submitted Work.
Executes the evaluation through GenLayer's non-deterministic execution.
Uses validator execution to compare the resulting decision.
Persists the resulting Assessment.
Marks the Submission as assessed.

The frontend does not generate or fabricate the Assessment.

After the transaction reaches FINALIZED, the frontend reads the Assessment from the Intelligent Contract and displays it as Canonical Protocol State.

One-Assessment Invariant

Each Submission can have only one canonical Assessment.

The invariant is enforced by the Intelligent Contract:

if self.submission_assessed[submission_id]:
    raise UserError("Submission already assessed")

Qualis exposes Verify Invariant to demonstrate this behavior.

The verification flow:

Existing Assessment
        │
        ▼
Attempt second assessment
        │
        ▼
Contract rejects duplicate
        │
        ▼
No second Assessment created

A wallet rejection, RPC failure, timeout, or transaction that does not reach finality is not treated as proof of contract enforcement.

Frontend

The frontend is a React application with the protocol lifecycle represented explicitly in application state.

src/
├── App.tsx
├── main.tsx
├── index.css
└── lib/
    ├── genlayer.ts
    └── qualis.ts

src/lib/qualis.ts contains the contract interaction layer.

src/App.tsx manages the lifecycle UI and wallet interaction.

The frontend uses finalized transaction state and contract reads rather than inventing protocol results.

Transaction Lifecycle

Every protocol write follows:

Validate prerequisites
        ↓
Wallet signature
        ↓
Broadcast transaction
        ↓
Wait for FINALIZED
        ↓
Read canonical contract state
        ↓
Update UI

Transaction hashes are stored independently for:

evaluationTxHash
submissionTxHash
assessmentTxHash

This allows the complete lifecycle to remain auditable from the UI.

Running Qualis
Requirements
Node.js
A compatible EIP-1193 wallet such as MetaMask or Rabby
A funded GenLayer Studionet wallet
GEN for transaction fees
Install
npm install

Create .env from .env.example and set:

VITE_QUALIS_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

Then run:

npm run dev
Production Build
npm run build
Studionet

Qualis currently targets GenLayer Studionet.

Parameter	Value
Network	GenLayer Studionet
Chain ID	61999
Currency	GEN
RPC	https://studio.genlayer.com/api

Deploy the contract through GenLayer Studio, then place the resulting contract address in the environment configuration.

Demo

A complete demonstration follows:

Create Evaluation
       ↓
Submit Work
       ↓
Generate Assessment
       ↓
Canonical Assessment
       ↓
Verify Invariant

For example:

Evaluation

Team 1 through Team 5 compete; the submission should identify the winning team.

Work

Team 1 wins.

Assessment

The Intelligent Contract produces an APPROVED or REJECTED decision with reasoning through GenLayer's non-deterministic execution.

Invariant

Attempting to assess the same Submission again results in the contract-level duplicate-assessment rejection.

Known Limitations
ID Derivation

The frontend derives newly created IDs from the finalized protocol count.

For example:

newId = totalCount - 1

This is suitable for the demonstration workflow, but concurrent creators could race and observe the wrong newly-created ID. A production implementation would use a stronger user-specific or transaction-bound ID retrieval strategy.

Studionet Availability

Studionet is a hosted development environment. RPC availability and rate limits can affect reads, transaction submission, and finality.

Evaluation Output

The assessment depends on the non-deterministic execution producing the expected structured result. Invalid or malformed execution output can cause an assessment transaction to fail.

Built With
GenLayer Intelligent Contracts
GenLayer non-deterministic execution
GenLayer Studionet
genlayer-js
React
TypeScript
Vite
License

MIT License
