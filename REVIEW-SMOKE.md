# Review pipeline smoke test (calibration)

Second disposable PR. It verifies [ADR-005 Amendment 3](decisions/ADR-005-review-check-signal.md):
a review that posts a real verdict should now stay **green** even if the agent
hit a stray tool denial, with the denied tools **named** in the Actions log — not
reddened as a good review was in #111.

Expected: a posted verdict comment, and if `denials > 0`, a green check plus a
"denied N tool call(s): …" warning naming the tools. **Closed, not merged.**
