// Glossary short forms for the hover tooltips (Term.astro).
//
// src/pages/glossary.astro is the source of truth: every slug here MUST match
// an existing `#term-<slug>` anchor on that page, and each `short` is a
// hand-cut one-to-two-sentence condensation of the matching entry there --
// same first-person voice, not a textbook definition. Edit the glossary entry
// first, then re-cut the short form here to match.
export const terms = {
  adr: {
    label: 'ADR / SYS-NNN',
    short:
      'A numbered record of a decision worth defending later: context, choice, tradeoff, alternatives. ADR-NNN stays inside one repo; SYS-NNN crosses repo boundaries.',
  },
  agent: {
    label: 'Agent',
    short:
      'Software that chains tool calls toward a goal instead of answering in one shot: pick a tool, read the result, decide the next step. kb-agent is mine.',
  },
  backgroundtask: {
    label: 'BackgroundTask',
    short:
      "A way to run a follow-up step right after a request without standing up a message queue. notes-api uses FastAPI's BackgroundTask to call the classifier and write its labels back as tags.",
  },
  baseline: {
    label: 'Baseline',
    short:
      'The simplest credible alternative, measured first, so the fancier approach has a number to beat instead of a vibe.',
  },
  bm25: {
    label: 'BM25',
    short:
      'A sparse keyword-retrieval method: it scores documents by how often and how distinctively they contain your query terms, no model required.',
  },
  classification: {
    label: 'Classification',
    short:
      'Sorting text into a fixed set of labels using a model, instead of hand-written rules. Mine assigns a category, an operational domain, and a region to each defense-news item.',
  },
  contract: {
    label: 'Contract seam',
    short:
      'The boundary where one service depends on another through a stable request/response shape. A real contract test needs a single shared artifact both sides check against. Mine did not have one until an audit proved it.',
  },
  eval: {
    label: 'Eval / eval harness',
    short:
      'A scored test set with known-correct answers, used to check whether a change actually helped, instead of trusting that it reads better.',
  },
  f1: {
    label: 'F1 / precision / recall',
    short:
      'Precision: of everything I labeled X, how much was actually X. Recall: of everything that was actually X, how much I caught. F1 balances the two, so neither alone can flatter the model.',
  },
  'false-green': {
    label: 'False green',
    short:
      'A check that reports success without being able to fail: green whether the work happened or not. A check that cannot fail is indistinguishable from a check that passes.',
  },
  'gold-set': {
    label: 'Gold set',
    short:
      'A hand-labeled evaluation set used as the reference answer key. Mine is small, pulled from real text rather than model-generated.',
  },
  idempotency: {
    label: 'Idempotency',
    short:
      'An operation that produces the same result whether it runs once or five times: safe to retry, no side effects pile up.',
  },
  kappa: {
    label: "Inter-rater agreement (Cohen's kappa)",
    short:
      'How often two graders agree, after subtracting the agreement they would reach by chance. Raw agreement flatters graders on unbalanced sets; kappa does not.',
  },
  'judge-model': {
    label: 'Judge model',
    short:
      "A separate model used to grade another model's output against the gold set, instead of grading it by hand at scale. Trusting a judge starts with measuring the judge.",
  },
  rag: {
    label: 'RAG (retrieval-augmented generation)',
    short:
      'Retrieve the relevant documents first, then hand only those to the model as grounding for its answer, instead of asking it to answer from memory.',
  },
  'recall-mrr': {
    label: 'Recall@k / MRR',
    short:
      'Retrieval scores: recall@k asks whether the right document showed up in the top k; MRR asks how far down the list it sat.',
  },
  'tool-use': {
    label: 'Tool use / structured output',
    short:
      'Forcing a model to respond through a defined schema, a function call with typed required fields, instead of parsing free text and hoping the format holds.',
  },
};
