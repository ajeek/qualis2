import React, { useState, useCallback } from "react";
import {
  CONTRACT_ADDRESS,
} from "./lib/genlayer";
import {
  createEvaluation,
  submitWork,
  assessSubmission,
  verifyInvariant,
  type Evaluation,
  type Submission,
  type Assessment,
} from "./lib/qualis";

// ------------------------------------------------------------------
// App state machine
// ------------------------------------------------------------------
type Phase =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "ready"
  | "creating_evaluation"
  | "evaluation_created"
  | "ready_for_submission"
  | "submitting_work"
  | "work_submitted"
  | "ready_for_assessment"
  | "assessing"
  | "assessment_finalized"
  | "verifying_invariant"
  | "invariant_verified"
  | "invariant_rejected"
  | "error";

interface AppState {
  phase: Phase;
  errorMessage?: string;
  errorAction?: string;
  evaluationId?: bigint;
  evaluation?: Evaluation;
  submissionId?: bigint;
  submission?: Submission;
  assessment?: Assessment;
  invariantMessage?: string;
  txHash?: string;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function truncateAddress(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatId(id: bigint): string {
  return id.toString();
}

// ------------------------------------------------------------------
// Main App
// ------------------------------------------------------------------
export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<unknown | null>(null);
  const [state, setState] = useState<AppState>({ phase: "disconnected" });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("qualis-theme");
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (e) {}
    return "light";
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("qualis-theme", theme);
  }, [theme]);


  // Form fields
  const [evalTitle, setEvalTitle] = useState("");
  const [evalDesc, setEvalDesc] = useState("");
  const [workContent, setWorkContent] = useState("");

  const setError = useCallback((message: string, action: string) => {
    console.error(`[QUALIS ERROR] ${action}:`, message);
    setState({ phase: "error", errorMessage: message, errorAction: action });
  }, []);

  // --------------------------------------------------------------
  // Wallet connection
  // --------------------------------------------------------------
  const connectWallet = useCallback(async () => {
    setState({ phase: "connecting" });

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setError(
        "No injected wallet detected. Please install MetaMask or another compatible wallet.",
        "connectWallet"
      );
      return;
    }

    let accounts: string[];
    try {
      accounts = await ethereum.request({ method: "eth_requestAccounts" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wallet connection rejected",
        "connectWallet"
      );
      return;
    }

    const addr = accounts[0];
    if (!addr || !addr.startsWith("0x") || addr.length !== 42) {
      setError("Invalid wallet address returned by provider", "connectWallet");
      return;
    }

    // Attempt network switch immediately
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xf22f" }], // 61999
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
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
          setState({
            phase: "wrong_network",
            errorMessage:
              "Could not auto-add to Studionet. " +
              "Please manually add the network:\n" +
              "RPC URL: https://studio.genlayer.com/api\n" +
              "Chain ID: 61999\n" +
              "Currency Symbol: GEN",
          });
          setAddress(addr);
          setProvider(ethereum);
          return;
        }
      } else {
        setState({
          phase: "wrong_network",
          errorMessage:
            "Could not auto-switch to Studionet. " +
            "Please manually add the network:\n" +
            "RPC URL: https://studio.genlayer.com/api\n" +
            "Chain ID: 61999\n" +
            "Currency Symbol: GEN",
        });
        setAddress(addr);
        setProvider(ethereum);
        return;
      }
    }

    setAddress(addr);
    setProvider(ethereum);
    setState({ phase: "ready" });
  }, [setError]);

  // --------------------------------------------------------------
  // Step 1: Create Evaluation
  // --------------------------------------------------------------
  const handleCreateEvaluation = useCallback(async () => {
    if (!address || !provider) {
      setError("Wallet not connected", "createEvaluation");
      return;
    }

    setState({ phase: "creating_evaluation" });

    try {
      const result = await createEvaluation(
        address,
        provider,
        evalTitle,
        evalDesc
      );
      setState({
        phase: "evaluation_created",
        evaluationId: result.evaluationId,
        evaluation: result.evaluation,
        txHash: result.txHash,
      });
      setEvalTitle("");
      setEvalDesc("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create evaluation",
        "createEvaluation"
      );
    }
  }, [address, provider, evalTitle, evalDesc, setError]);

  // --------------------------------------------------------------
  // Step 2: Submit Work
  // --------------------------------------------------------------
  const handleSubmitWork = useCallback(async () => {
    if (!address || !provider) {
      setError("Wallet not connected", "submitWork");
      return;
    }
    if (state.evaluationId === undefined) {
      setError("No evaluation selected", "submitWork");
      return;
    }

    setState((s) => ({ ...s, phase: "submitting_work" }));

    try {
      const result = await submitWork(
        address,
        provider,
        state.evaluationId,
        workContent
      );
      setState({
        phase: "work_submitted",
        evaluationId: state.evaluationId,
        submissionId: result.submissionId,
        submission: result.submission,
        txHash: result.txHash,
      });
      setWorkContent("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit work",
        "submitWork"
      );
    }
  }, [address, provider, state.evaluationId, workContent, setError]);

  // --------------------------------------------------------------
  // Step 3: Generate Assessment
  // --------------------------------------------------------------
  const handleAssess = useCallback(async () => {
    if (!address || !provider) {
      setError("Wallet not connected", "assessSubmission");
      return;
    }
    if (state.submissionId === undefined) {
      setError("No submission selected", "assessSubmission");
      return;
    }

    setState((s) => ({ ...s, phase: "assessing" }));

    try {
      const result = await assessSubmission(
        address,
        provider,
        state.submissionId
      );
      setState({
        phase: "assessment_finalized",
        evaluationId: state.evaluationId,
        submissionId: state.submissionId,
        assessment: result.assessment,
        txHash: result.txHash,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate assessment",
        "assessSubmission"
      );
    }
  }, [address, provider, state.submissionId, state.evaluationId, setError]);

  // --------------------------------------------------------------
  // Invariant check
  // --------------------------------------------------------------
  const handleVerifyInvariant = useCallback(async () => {
    if (!address || !provider) {
      setError("Wallet not connected", "verifyInvariant");
      return;
    }
    if (state.submissionId === undefined) {
      setError("No submission selected", "verifyInvariant");
      return;
    }

    setState((s) => ({ ...s, phase: "verifying_invariant" }));

    try {
      const result = await verifyInvariant(
        address,
        provider,
        state.submissionId
      );
      if (result.verified) {
        setState({
          phase: "invariant_verified",
          submissionId: state.submissionId,
          invariantMessage: result.message,
        });
      } else {
        setState({
          phase: "invariant_rejected",
          submissionId: state.submissionId,
          invariantMessage: result.message,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify invariant",
        "verifyInvariant"
      );
    }
  }, [address, provider, state.submissionId, setError]);

  // --------------------------------------------------------------
  // Navigation helpers
  // --------------------------------------------------------------
  const goToSubmit = useCallback(() => {
    setState((s) => ({ ...s, phase: "ready_for_submission" }));
  }, []);

  const goToAssess = useCallback(() => {
    setState((s) => ({ ...s, phase: "ready_for_assessment" }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, phase: address ? "ready" : "disconnected", errorMessage: undefined, errorAction: undefined, evaluationId: undefined, evaluation: undefined, submissionId: undefined, submission: undefined, assessment: undefined, invariantMessage: undefined, txHash: undefined }));
    setEvalTitle("");
    setEvalDesc("");
    setWorkContent("");
  }, [address]);

  // --------------------------------------------------------------
  // Render
  // --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-primary font-sans selection:bg-selection-bg selection:text-selection-text">
      {/* Header */}
      <header className="border-b border-border">
        <div className="w-full px-6 py-5 flex items-center justify-between">
          <div className="cursor-pointer group" onClick={reset}>
            <h1 className="text-2xl font-bold tracking-tight text-primary group-hover:text-accent transition-colors">
              QUALIS
            </h1>
            <p className="text-xs text-muted mt-0.5 tracking-wide uppercase">
              GenLayer-native Evaluation Protocol
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-2 text-muted hover:text-primary transition-colors focus:outline-none"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            {address ? (
              <div className="relative group">
                <div className="flex items-center gap-1.5 text-sm cursor-pointer py-1 text-primary font-medium">
                  <span>Wallet</span>
                  <span className="text-muted">·</span>
                  <span className="font-mono">{truncateAddress(address)}</span>
                </div>
                <div className="absolute right-0 top-full pt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <div className="bg-surface border border-border rounded shadow-xl p-2">
                    <div className="px-3 py-2 text-xs text-muted font-mono break-all mb-1">
                      {address}
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(address)}
                      className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-surface-secondary rounded transition-colors"
                    >
                      Copy Address
                    </button>
                    <button
                      onClick={() => {
                        setAddress(null);
                        setProvider(null);
                        setState({ phase: "disconnected" });
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-error hover:bg-surface-secondary rounded mt-1 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={state.phase === "connecting"}
                className="text-sm cursor-pointer py-1 text-muted hover:text-primary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.phase === "connecting" ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Protocol explanation */}
        <section className="mb-12">
          <p className="text-secondary leading-relaxed">
            Qualis demonstrates why GenLayer matters. A user creates an{" "}
            <strong className="text-primary">Evaluation</strong> with
            criteria. A user submits{" "}
            <strong className="text-primary">Work</strong> against it.
            GenLayer performs{" "}
            <strong className="text-primary">
              non-deterministic execution
            </strong>{" "}
            to evaluate the Work. Validator consensus makes the resulting{" "}
            <strong className="text-primary">Assessment</strong> canonical
            protocol state.
          </p>
        </section>



        {/* Wrong network */}
        {state.phase === "wrong_network" && (
          <section className="mb-12 p-4 border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 rounded">
            <h3 className="text-amber-700 dark:text-amber-700 dark:text-amber-400 font-semibold mb-2">
              Wrong Network
            </h3>
            <p className="text-amber-700 dark:text-amber-200/80 text-sm whitespace-pre-line">
              {state.errorMessage}
            </p>
            <button
              onClick={connectWallet}
              className="mt-3 text-xs px-3 py-1.5 border border-amber-400 text-amber-700 dark:border-amber-700 dark:text-amber-700 dark:text-amber-400 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              Retry Connection
            </button>
          </section>
        )}

        {/* Error state */}
        {state.phase === "error" && (
          <section className="mb-12 p-4 border border-red-800 bg-red-950/30 rounded">
            <h3 className="text-error font-semibold mb-1">Transaction Failed</h3>
            <p className="text-red-200/80 text-sm">{state.errorMessage}</p>
            <p className="text-red-200/50 text-xs mt-1">
              Action: {state.errorAction}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={reset}
                className="text-xs px-3 py-1.5 border border-red-700 text-error rounded hover:bg-red-900/50"
              >
                Reset
              </button>
            </div>
          </section>
        )}

        {/* STEP 01 — Create Evaluation */}
        {(state.phase === "ready" ||
          state.phase === "creating_evaluation" ||
          state.phase === "evaluation_created" ||
          state.phase === "ready_for_submission" ||
          state.phase === "submitting_work" ||
          state.phase === "work_submitted" ||
          state.phase === "ready_for_assessment" ||
          state.phase === "assessing" ||
          state.phase === "assessment_finalized" ||
          state.phase === "verifying_invariant" ||
          state.phase === "invariant_verified" ||
          state.phase === "invariant_rejected") && (
          <StepSection
            number="01"
            title="Create Evaluation"
            status={
              state.phase === "creating_evaluation"
                ? "loading"
                : state.evaluationId !== undefined
                ? "done"
                : "active"
            }
          >
            {state.evaluationId === undefined ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">
                    Title
                  </label>
                  <input
                    type="text"
                    value={evalTitle}
                    onChange={(e) => setEvalTitle(e.target.value)}
                    placeholder="e.g., Best Technical Blog Post"
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-primary placeholder:text-muted focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">
                    Description / Criteria
                  </label>
                  <textarea
                    value={evalDesc}
                    onChange={(e) => setEvalDesc(e.target.value)}
                    placeholder="Describe what makes work acceptable..."
                    rows={3}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-primary placeholder:text-muted focus:outline-none focus:border-secondary resize-none"
                  />
                </div>
                <button
                  onClick={handleCreateEvaluation}
                  disabled={
                    state.phase === "creating_evaluation" ||
                    !evalTitle.trim() ||
                    !evalDesc.trim()
                  }
                  className="px-4 py-2 bg-button text-button-text text-sm font-semibold rounded hover:bg-button-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {state.phase === "creating_evaluation"
                    ? "Waiting for consensus..."
                    : "Create Evaluation"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-accent font-mono">✓</span>
                  <span className="text-primary">
                    Evaluation #{formatId(state.evaluationId)}
                  </span>
                </div>
                {state.evaluation && (
                  <div className="pl-5 space-y-1">
                    <p className="text-sm text-primary font-medium">
                      {state.evaluation.title}
                    </p>
                    <p className="text-xs text-muted">
                      {state.evaluation.description}
                    </p>
                  </div>
                )}
                {state.txHash && (
                  <p className="pl-5 text-xs text-muted font-mono">
                    Tx: {truncateAddress(state.txHash)}
                  </p>
                )}
                {state.phase === "evaluation_created" && (
                  <button
                    onClick={goToSubmit}
                    className="ml-5 mt-2 text-xs px-3 py-1.5 border border-border text-primary rounded hover:bg-surface-secondary"
                  >
                    Proceed to Submit Work →
                  </button>
                )}
              </div>
            )}
          </StepSection>
        )}

        {/* STEP 02 — Submit Work */}
        {(state.phase === "ready_for_submission" ||
          state.phase === "submitting_work" ||
          state.phase === "work_submitted" ||
          state.phase === "ready_for_assessment" ||
          state.phase === "assessing" ||
          state.phase === "assessment_finalized" ||
          state.phase === "verifying_invariant" ||
          state.phase === "invariant_verified" ||
          state.phase === "invariant_rejected") && (
          <StepSection
            number="02"
            title="Submit Work"
            status={
              state.phase === "submitting_work"
                ? "loading"
                : state.submissionId !== undefined
                ? "done"
                : "active"
            }
          >
            {state.submissionId === undefined ? (
              <div className="space-y-3">
                <div className="text-xs text-muted">
                  Evaluation: #{formatId(state.evaluationId!)}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">
                    Submission Content
                  </label>
                  <textarea
                    value={workContent}
                    onChange={(e) => setWorkContent(e.target.value)}
                    placeholder="Paste your work here..."
                    rows={4}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-primary placeholder:text-muted focus:outline-none focus:border-secondary resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmitWork}
                  disabled={
                    state.phase === "submitting_work" || !workContent.trim()
                  }
                  className="px-4 py-2 bg-button text-button-text text-sm font-semibold rounded hover:bg-button-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {state.phase === "submitting_work"
                    ? "Waiting for consensus..."
                    : "Submit Work"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-accent font-mono">✓</span>
                  <span className="text-primary">
                    Submission #{formatId(state.submissionId)}
                  </span>
                </div>
                {state.submission && (
                  <div className="pl-5">
                    <p className="text-xs text-muted mb-1">
                      Evaluation #{formatId(state.submission.evaluation_id)}
                    </p>
                    <p className="text-sm text-primary bg-surface/50 p-2 rounded border border-border/50 line-clamp-3">
                      {state.submission.content}
                    </p>
                  </div>
                )}
                {state.txHash && (
                  <p className="pl-5 text-xs text-muted font-mono">
                    Tx: {truncateAddress(state.txHash)}
                  </p>
                )}
                {state.phase === "work_submitted" && (
                  <button
                    onClick={goToAssess}
                    className="ml-5 mt-2 text-xs px-3 py-1.5 border border-border text-primary rounded hover:bg-surface-secondary"
                  >
                    Proceed to Assessment →
                  </button>
                )}
              </div>
            )}
          </StepSection>
        )}

        {/* STEP 03 — Assessment */}
        {(state.phase === "ready_for_assessment" ||
          state.phase === "assessing" ||
          state.phase === "assessment_finalized" ||
          state.phase === "verifying_invariant" ||
          state.phase === "invariant_verified" ||
          state.phase === "invariant_rejected") && (
          <StepSection
            number="03"
            title="Assessment"
            status={
              state.phase === "assessing"
                ? "loading"
                : state.assessment !== undefined
                ? "done"
                : "active"
            }
          >
            {state.assessment === undefined ? (
              <div className="space-y-3">
                <p className="text-sm text-secondary leading-relaxed">
                  This invokes GenLayer{" "}
                  <strong className="text-primary">
                    non-deterministic execution
                  </strong>
                  . GenLayer performs non-deterministic execution.
                  A leader validator evaluates the Work against the Evaluation criteria.
                  Validator consensus makes the Assessment canonical protocol state.

                </p>
                <div className="text-xs text-muted">
                  Submission: #{formatId(state.submissionId!)}
                </div>
                <button
                  onClick={handleAssess}
                  disabled={state.phase === "assessing"}
                  className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {state.phase === "assessing"
                    ? "Executing non-deterministic evaluation..."
                    : "Generate Assessment"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Canonical Protocol State */}
                <div className="p-4 border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 rounded">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
                    Canonical Protocol State
                  </h4>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`text-lg font-bold ${
                        state.assessment!.decision === "APPROVED"
                          ? "text-accent"
                          : "text-error"
                      }`}
                    >
                      {state.assessment!.decision}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted uppercase tracking-wider">
                        Reasoning
                      </span>
                      <p className="text-sm text-primary mt-1 leading-relaxed">
                        {state.assessment!.reasoning}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted uppercase tracking-wider">
                        Submission Reference
                      </span>
                      <p className="text-sm text-primary mt-1 font-mono">
                        #{formatId(state.assessment!.submission_id)}
                      </p>
                    </div>
                  </div>
                  {state.txHash && (
                    <p className="mt-3 text-xs text-muted font-mono">
                      Consensus Tx: {truncateAddress(state.txHash)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </StepSection>
        )}

        {/* PROTOCOL INTEGRITY */}
        {state.assessment !== undefined && (
          <section className="mt-8 pt-8 border-t border-border">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">
              Protocol Integrity
            </h3>
            <p className="text-sm text-secondary mb-4">
              Each Submission can have only one canonical Assessment. This
              invariant is enforced by the Intelligent Contract itself, not by
              frontend logic.
            </p>

            {(state.phase === "assessment_finalized" ||
              state.phase === "verifying_invariant" ||
              state.phase === "invariant_verified" ||
              state.phase === "invariant_rejected") && (
              <button
                onClick={handleVerifyInvariant}
                disabled={state.phase === "verifying_invariant"}
                className="px-4 py-2 border border-border text-primary text-sm rounded hover:bg-surface-secondary transition-colors disabled:opacity-40"
              >
                {state.phase === "verifying_invariant"
                  ? "Verifying..."
                  : "Verify Invariant"}
              </button>
            )}

            {state.phase === "invariant_verified" && (
              <div className="mt-3 p-3 border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 rounded">
                <p className="text-sm text-accent">
                  {state.invariantMessage}
                </p>
              </div>
            )}

            {state.phase === "invariant_rejected" && (
              <div className="mt-3 p-3 border border-red-900/50 bg-red-950/20 rounded">
                <p className="text-sm text-error">
                  {state.invariantMessage}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Reset */}
        {state.evaluationId !== undefined && (
          <div className="mt-10 text-center">
            <button
              onClick={reset}
              className="text-xs text-muted hover:text-primary underline underline-offset-4"
            >
              Start New Lifecycle
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="fixed bottom-4 left-6 right-6 flex justify-between items-end z-50 pointer-events-none">
          <p className="text-xs text-muted pointer-events-auto">
            <a
              href="https://x.com/idnurey"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Built by Archers
            </a>
          </p>
          <p className="text-xs text-muted pointer-events-auto text-right">
            Contract:{" "}
            <a
              href={`https://explorer.studio.genlayer.com/contract/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {truncateAddress(CONTRACT_ADDRESS)}
            </a>{" "}
            · Studionet
          </p>
        </footer>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------
// StepSection component
// ------------------------------------------------------------------
function StepSection({
  number,
  title,
  status,
  children,
}: {
  number: string;
  title: string;
  status: "active" | "loading" | "done";
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
            status === "done"
              ? "bg-selection-bg text-accent"
              : status === "loading"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-700 dark:text-amber-400"
              : "bg-surface-secondary text-secondary"
          }`}
        >
          {status === "done" ? "✓" : number}
        </span>
        <h2
          className={`text-sm font-semibold uppercase tracking-wider ${
            status === "done"
              ? "text-accent"
              : status === "loading"
              ? "text-amber-700 dark:text-amber-400"
              : "text-primary"
          }`}
        >
          {title}
        </h2>
        {status === "loading" && (
          <span className="text-xs text-amber-600 dark:text-amber-500 animate-pulse">
            Processing...
          </span>
        )}
      </div>
      <div className="pl-10">{children}</div>
    </section>
  );
}
