#!/usr/bin/env python3
"""Estimate the cost of a multi-agent fan-out BEFORE running it.

Precise cost is unknowable ahead of an agentic run - total cost depends on how
many tool calls and how much reading the agents choose to do mid-run. But the
*tier* (how big the fan-out is) and the *model* are both known up front, and
that is enough to answer the only question that matters before you hit go:
"could this blow my usage window?"

Outputs, per tier and model: estimated weighted tokens, the fraction of one
5-hour usage window that represents, and whether it's safe / caution / will
exhaust the window.

CALIBRATION
-----------
Example anchor: one Sonnet-fleet deep-research fan-out measured ~4.5M weighted
tokens and consumed ~95% of a 5-hour usage window -> the window holds roughly
4.75M weighted Sonnet-equivalent tokens. Set WINDOW_SONNET_EQUIV to your own
plan: run one job, check your usage status for the %% consumed, back out the
total.

Premium models draw the window down FASTER per token. MODEL_WEIGHT is that
relative draw (Sonnet = 1.0). The Opus / Fable 5 multipliers are ESTIMATES -
confirm against current pricing / your own usage readings and adjust. This is
the single biggest lever in the estimate, so calibrate it before trusting a
premium-model number.
"""
import sys

# ---- calibrate these two to your plan --------------------------------------
WINDOW_SONNET_EQUIV = 4_750_000          # weighted Sonnet-equiv tokens per 5-hr window
MODEL_WEIGHT = {
    "haiku":  0.25,
    "sonnet": 1.0,
    "opus":   5.0,   # estimate - premium tier
    "fable":  5.0,   # estimate - premium tier; CONFIRM before relying
}
# ----------------------------------------------------------------------------

# Rough weighted-token ranges per fan-out tier (low, high).
TIERS = {
    "inline": (10_000, 100_000),      # searches, reads, edits, a doc write
    "small":  (300_000, 1_000_000),   # 3-6 agents, single pass
    "full":   (4_000_000, 8_000_000), # deep-research / 30-50+ agents, multi-round verify
}


def band(frac):
    if frac < 0.15:
        return "SAFE"
    if frac < 0.50:
        return "CAUTION"
    if frac < 1.0:
        return "HEAVY - cap it"
    return "EXHAUSTS WINDOW"


def rec_cap(low):
    tokens = int(low)  # cap is on raw weighted tokens, model-independent
    k = max(50, round(tokens / 1000 / 2))
    return f"+{k}k"


def row(tier, model):
    low, high = TIERS[tier]
    w = MODEL_WEIGHT[model]
    flo = low * w / WINDOW_SONNET_EQUIV
    fhi = high * w / WINDOW_SONNET_EQUIV
    return (f"  {tier:7} {model:7} "
            f"{low/1e6:4.2f}-{high/1e6:4.2f}M tok  "
            f"{flo*100:5.0f}-{fhi*100:3.0f}%% window   "
            f"{band(fhi):16} cap {rec_cap(low)}")


def main():
    args = sys.argv[1:]
    models = ["haiku", "sonnet", "opus", "fable"]
    tiers = ["inline", "small", "full"]
    if len(args) == 2:
        tiers, models = [args[0]], [args[1]]
    print(f"\nWindow = {WINDOW_SONNET_EQUIV/1e6:.2f}M weighted Sonnet-equiv tokens "
          f"(calibrate to your plan)\n")
    print("  tier    model   est tokens       %% of 5-hr window   verdict          suggested")
    print("  " + "-" * 82)
    for t in tiers:
        for m in models:
            print(row(t, m))
        print()
    print("Reminder: this bounds the tier, it does not predict the exact run. "
          "Always cap the call.\n")


if __name__ == "__main__":
    main()
