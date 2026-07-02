# Fan-out cost control: a finding, and the guardrail

A measured failure mode of agentic tools, and how to stop repeating it.

## The finding (measured, 2026-07-02)

A single multi-agent "deep-research" fan-out - dozens of sub-agents searching,
reading, verifying, and synthesizing - running **entirely on a premium model**
(claude-fable-5, confirmed from the run's transcript) consumed **~95% of a
5-hour usage window in ~45 minutes**, with no cost preview before launch.
Straight from the run's own token accounting:

| Metric | Value |
|---|---|
| Raw tokens | ~18.3M |
| — cache reads (bill ~0.1x) | 15.9M (~87%) |
| — fresh input | 483k |
| — cache creation | 1.9M |
| — output | 27k |
| **Billing-weighted total** | **~4.5M** |
| **Share of 5-hour window** | **~95%** |
| Wall-clock | ~45 min |
| Agents | ~50 (killed mid-verify; results salvaged) |

Two things made it costly and invisible: it ran on a **premium model** (fastest
window-draw), and **nothing surfaced the likely cost before launch.**

## What it implies

- The 5-hour window holds **~4.75M billing-weighted tokens at premium
  (Fable/Opus) rates.** That is the calibration anchor.
- On a premium model, a **full fan-out is roughly your whole window.** The same
  fan-out on Sonnet is about **5x cheaper** (~17-34% of the window) - Sonnet
  draws ~0.2x the premium rate per token. (Only the premium point is measured;
  the cross-model ratio is an estimate - calibrate it.)
- Raw "18M tokens" wildly overstates cost: ~87% were cache reads at ~0.1x
  billing. Judge by the **weighted** number (~4.5M) and by **output** (a
  trivial 27k), never by raw throughput.

## Why there's no exact pre-estimate

The cost of an agentic run is unknowable before it runs: it depends on how many
tool calls and how much reading the agents *decide* to do mid-flight. You can't
quote it exactly - the same way you can't quote a legal bill before knowing how
many depositions happen. So don't predict the cost. **Bound it.**

## What you CAN know up front: tier and model

- **Tier** - inline (~10-100k weighted), small workflow / 3-6 agents
  (~0.3-1M), full fan-out / 30-50+ agents (~4-8M).
- **Model** - the biggest lever. Corrected, calibrated numbers:

| Tier | Sonnet | Premium (Fable/Opus) |
|---|---|---|
| inline | ~0% window | 0-2% window |
| small (3-6 agents) | 1-4% | 6-21% |
| full fan-out | 17-34% | **84-168% (exhausts)** |

**Rule: run fan-outs on Sonnet; reserve premium models for inline or
tightly-capped work.** A "small job" on a premium model still eats a fifth of
your window.

## The estimator

[`scripts/estimate-fanout-cost.py`](../scripts/estimate-fanout-cost.py) prints
this tier x model matrix with a suggested cap. Calibrate `WINDOW_WEIGHTED_TOKENS`
and the per-model weights to your plan (run one job, read the % consumed from
your usage status, back out the total). Run it *before* anything above inline.

## The pre-flight protocol

1. State the tier + a rough token/time estimate (use the estimator).
2. Set an explicit token cap the run cannot cross.
3. Get an explicit go-ahead.
4. Include the cap in the call.

## The guardrail

A `PreToolUse` hook can hard-block any uncapped fan-out, forcing the estimate +
cap + go-ahead before a launch is even possible. Cap, don't predict.

---

Same thesis as the rest of this work: set the direction, the contracts, and the
bar - and make cost one of the contracts, not a surprise you find out about 45
minutes and a whole usage window later.
