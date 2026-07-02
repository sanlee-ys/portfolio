#!/usr/bin/env python3
"""Estimate the cost of a multi-agent fan-out BEFORE running it.

Precise cost is unknowable ahead of an agentic run - total cost depends on how
many tool calls and how much reading the agents choose to do mid-run. But the
*tier* (how big the fan-out is) and the *model* are both known up front, and
that is enough to answer the only question that matters before you hit go:
"could this blow my usage window?"

CALIBRATION ANCHOR (measured, 2026-07-02)
-----------------------------------------
A deep-research fan-out running entirely on a premium model (claude-fable-5,
confirmed from the transcript) measured ~4.5M billing-weighted tokens
(~18.3M raw; ~90%% cache reads, which bill at ~0.1x) and consumed ~95%% of a
5-hour usage window in ~45 minutes. So the window holds ~4.75M weighted tokens
AT PREMIUM (Fable/Opus) RATES. That single point is the anchor below.

MODEL_WEIGHT is each model's window-draw per token relative to premium = 1.0.
Only the premium point is measured; the Sonnet/Haiku ratios are ESTIMATES -
calibrate them by running one small job per model and reading the %% consumed
from your usage status. This cross-model ratio is the biggest source of error.
"""
import sys

# ---- calibrate to your plan ------------------------------------------------
WINDOW_WEIGHTED_TOKENS = 4_750_000   # measured: ~95%% window = ~4.5M weighted on Fable 5
MODEL_WEIGHT = {                     # window-draw per token, premium = 1.0
    "fable":  1.0,   # MEASURED anchor
    "opus":   1.0,   # premium tier; assumed same as Fable pending calibration
    "sonnet": 0.2,   # ESTIMATE (~5x cheaper than premium)
    "haiku":  0.05,  # ESTIMATE
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
    k = max(50, round(int(low) / 1000 / 2))
    return f"+{k}k"


def row(tier, model):
    low, high = TIERS[tier]
    w = MODEL_WEIGHT[model]
    flo = low * w / WINDOW_WEIGHTED_TOKENS
    fhi = high * w / WINDOW_WEIGHTED_TOKENS
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
    print(f"\nWindow = {WINDOW_WEIGHTED_TOKENS/1e6:.2f}M weighted tokens at premium "
          f"(Fable/Opus) rates; measured 2026-07-02. Calibrate to your plan.\n")
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
