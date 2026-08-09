# genlayer version: 0.1.0

import genlayer as gl
from genlayer import UserError


class Evaluation:
    title: str
    description: str


class Submission:
    evaluation_id: u256
    content: str


class Assessment:
    submission_id: u256
    decision: str
    reasoning: str


class Qualis(gl.Contract):
    """
    Qualis is a GenLayer-native evaluation protocol.

    Lifecycle:
      1. create_evaluation(title, description)
      2. submit_work(evaluation_id, content)
      3. assess_submission(submission_id)  -> non-deterministic execution
      4. Assessment becomes canonical protocol state

    Invariant: ONE canonical Assessment per Submission.
    The contract enforces this invariant directly via submission_assessed.
    """

    evaluations: DynArray[Evaluation]
    submissions: DynArray[Submission]
    assessments: DynArray[Assessment]
    submission_assessed: DynArray[bool]

    def __init__(self):
        self.evaluations = []
        self.submissions = []
        self.assessments = []
        self.submission_assessed = []

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------
    @gl.public.write
    def create_evaluation(self, title: str, description: str) -> None:
        if len(title) == 0:
            raise UserError("Invalid title: cannot be empty")
        if len(description) == 0:
            raise UserError("Invalid description: cannot be empty")

        self.evaluations.append(Evaluation(title=title, description=description))

    @gl.public.view
    def get_evaluation(self, evaluation_id: u256) -> Evaluation:
        if evaluation_id >= len(self.evaluations):
            raise UserError("Evaluation does not exist")
        return self.evaluations[evaluation_id]

    # ------------------------------------------------------------------
    # Submission
    # ------------------------------------------------------------------
    @gl.public.write
    def submit_work(self, evaluation_id: u256, content: str) -> None:
        if evaluation_id >= len(self.evaluations):
            raise UserError("Evaluation does not exist")
        if len(content) == 0:
            raise UserError("Invalid submission content: cannot be empty")

        self.submissions.append(Submission(evaluation_id=evaluation_id, content=content))
        self.submission_assessed.append(False)

    @gl.public.view
    def get_submission(self, submission_id: u256) -> Submission:
        if submission_id >= len(self.submissions):
            raise UserError("Submission does not exist")
        return self.submissions[submission_id]

    # ------------------------------------------------------------------
    # Assessment  (non-deterministic execution)
    # ------------------------------------------------------------------
    @gl.public.write
    def assess_submission(self, submission_id: u256) -> None:
        # 1. Verify submission exists
        if submission_id >= len(self.submissions):
            raise UserError("Submission does not exist")

        # 2. Verify one-assessment invariant
        if self.submission_assessed[submission_id]:
            raise UserError("Submission already assessed")

        # 3. Load evaluation and submission into locals
        #    (storage is inaccessible inside non-deterministic blocks)
        submission = self.submissions[submission_id]
        evaluation = self.evaluations[submission.evaluation_id]

        eval_title = evaluation.title
        eval_desc = evaluation.description
        work_content = submission.content

        # 4. Non-deterministic execution via custom leader/validator
        def leader_fn():
            prompt = f"""You are an evaluator assessing work against defined criteria.

EVALUATION TITLE: {eval_title}
EVALUATION CRITERIA: {eval_desc}
WORK CONTENT: {work_content}

Your task: Assess whether the work satisfies the evaluation criteria.
Respond with ONLY a JSON object in this exact format:
{{"decision": "APPROVED" or "REJECTED", "reasoning": "detailed explanation of your assessment"}}

No other text. Only valid JSON."""

            response = gl.nondet.exec_prompt(prompt)
            import json
            parsed = json.loads(response)
            decision = parsed["decision"]
            reasoning = parsed["reasoning"]

            if decision not in ["APPROVED", "REJECTED"]:
                raise UserError("Invalid decision from evaluator")

            return {"decision": decision, "reasoning": reasoning}

        def validator_fn(leader_result):
            # Check leader result type
            if not isinstance(leader_result, gl.vm.Return):
                return False

            leader_data = leader_result.calldata
            if not isinstance(leader_data, dict):
                return False
            if "decision" not in leader_data or "reasoning" not in leader_data:
                return False
            if leader_data["decision"] not in ["APPROVED", "REJECTED"]:
                return False

            # Independent verification: re-run same evaluation
            prompt = f"""You are an evaluator assessing work against defined criteria.

EVALUATION TITLE: {eval_title}
EVALUATION CRITERIA: {eval_desc}
WORK CONTENT: {work_content}

Your task: Assess whether the work satisfies the evaluation criteria.
Respond with ONLY a JSON object in this exact format:
{{"decision": "APPROVED" or "REJECTED", "reasoning": "detailed explanation of your assessment"}}

No other text. Only valid JSON."""

            response = gl.nondet.exec_prompt(prompt)
            import json
            parsed = json.loads(response)
            validator_decision = parsed["decision"]

            # Partial field matching: only the decision must agree
            return leader_data["decision"] == validator_decision

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        # 5. Persist canonical Assessment
        self.assessments.append(Assessment(
            submission_id=submission_id,
            decision=result["decision"],
            reasoning=result["reasoning"]
        ))
        self.submission_assessed[submission_id] = True

    # ------------------------------------------------------------------
    # Assessment queries
    # ------------------------------------------------------------------
    @gl.public.view
    def get_assessment(self, assessment_id: u256) -> Assessment:
        if assessment_id >= len(self.assessments):
            raise UserError("Assessment does not exist")
        return self.assessments[assessment_id]

    @gl.public.view
    def get_assessment_by_submission(self, submission_id: u256) -> Assessment:
        if submission_id >= len(self.submissions):
            raise UserError("Submission does not exist")
        if not self.submission_assessed[submission_id]:
            raise UserError("Submission has not been assessed")

        for assessment in self.assessments:
            if assessment.submission_id == submission_id:
                return assessment

        raise UserError("Assessment not found")

    @gl.public.view
    def has_assessment(self, submission_id: u256) -> bool:
        if submission_id >= len(self.submissions):
            raise UserError("Submission does not exist")
        return self.submission_assessed[submission_id]

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------
    @gl.public.view
    def get_stats(self) -> dict[str, u256]:
        return {
            "total_evaluations": len(self.evaluations),
            "total_submissions": len(self.submissions),
            "total_assessments": len(self.assessments)
        }
