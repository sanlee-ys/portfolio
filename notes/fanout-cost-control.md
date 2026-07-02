# Estimating multi-agent fan-out cost before you run it

A note on a failure mode of agentic tools, and the guardrail for it.

## The problem

Multi-agent "fan-out" workflows - a research task that spawns dozens of
sub-agents to search, read, verify, and synthesize - can be enormously
expensive, and there is often no built-in preview of what one will cost before
you launch it. A single deep-research-style run can consume an entire
subscription usage window in one shot, with no heads-up.

## Why there's no exact pre-estimate

The cost of an agentic run is unknowable before it runs: it depends on how many
tool calls and how much reading the agents *decide* to do mid-flight. You can't
quote it exactly, the same way you can't quote a legal bill before knowing how
many depositions happen.

## What you CAN know up front: tier and model

Two things are known before launch, and they're enough to answer "could this
blow my window?":

- **Tier** - how big the fan-out is. Rough weighted-token ranges: inline
  ~10-100k; small workflow (3-6 agents) ~0.3-1M; full fan-out (30-50+ agents,
  multi-round verify) ~4-8M.
- **Model** - premium models draw a usage window down far faster per token.

## Model choice is the biggest lever

The same fan-out costs multiples more on a premium model. Calibrated against one
Sonnet-fleet full run (~4.5M weighted tokens, about 95% of a 5-hour window):

- A **full fan-out on Sonnet** is roughly your whole window.
- On a **premium model (~5x the window-draw)**, even a **small** workflow can
  hit 30-100% of the window, and a full fan-out is **4-8 windows**.

So "small job, premium model" is a trap: it feels cheap and empties your window.

## The estimator

[`scripts/estimate-fanout-cost.py`](../scripts/estimate-fanout-cost.py) prints a
tier x model matrix - estimated tokens, % of a 5-hour window, and a suggested
cap. Calibrate `WINDOW_SONNET_EQUIV` and the premium-model weights to your own
plan (run one job, read the % consumed from your usage status, back out the
total). Run it *before* you launch anything above inline tier.

## The pre-flight protocol

Before firing any fan-out above inline tier:

1. State the tier + a rough token/time estimate (use the estimator).
2. Set an explicit token cap the run cannot cross.
3. Get an explicit go-ahead.
4. Include the cap in the call.

Cap, don't predict. You can't estimate the exact cost, but you can bound it: the
run truncates and synthesizes with what it has when it hits the ceiling.

## Read the bill correctly

Raw "total tokens" overstates cost - cached reads bill at ~10% of fresh input.
Weight it: fresh input 1x, cache creation ~1.25x, cache read ~0.1x, and watch
output (low volume, high per-token). A run that re-reads the same context looks
huge and bills modestly.

---

Same thesis as the rest of this site: set the direction, the contracts, and the
bar - and make cost one of the contracts, not a surprise.
