> **Parked here for pickup.** Destination: `kb-agent` repo, suggested path
> `docs/SYS-XXX-tool-seam-threat-model.md` (renumber to the real next
> `SYS-NNN`). Drafted in a portfolio-repo-only session that couldn't write to
> `kb-agent` directly — see `handoff/README.md` for why this folder exists.
> Once committed to `kb-agent`, delete this file and its row in that README.

# SYS-XXX — kb-agent tool-seam threat model (DRAFT)

Status: draft, unverified against source. Everything below was reconstructed
via a summarizing web fetch of the public repo, not a direct read of the
code — verify each claim against `agent/tools.py` and `agent/agent.py`
before treating this as authoritative. (Same discipline as SYS-anything
else here: don't assert what you haven't checked against the real repo.)

## Scope

Subject: the boundary where tool results re-enter the model's context in
kb-agent — the point where attacker-reachable content (KB chunks, note
content) becomes part of what the model reads as "the conversation."

Out of scope for this pass: the model provider's own safety training,
red-teaming Claude itself, and anything upstream of kb-agent (e.g. how
notes-api or the classifier validate their own inputs — each of those
gets its own threat model if this is worth repeating per-repo).

## Assets

- **Answer integrity** — the agent's synthesized answers and citations
  must reflect what the KB/notes actually say, not what an attacker
  wants them to say.
- **KB/notes confidentiality** — content retrieved for one query should
  not be exfiltrated to a destination the user didn't request.
- **Availability / cost** — the agent shouldn't be steerable into
  runaway tool-call loops (token/dollar burn) or hangs.
- **Downstream integrity** — nothing in kb-agent currently *writes*
  anywhere, so this asset is presently N/A. Flag if that changes.

## Tool inventory and per-tool exposure

| Tool | Type | Reads/calls | LLM-controlled params | Write? | External reach? |
|---|---|---|---|---|---|
| `search_kb` | local | ChromaDB persistent collection | `query`, `kind`, `n_results` | No | No |
| `list_projects` | local | `projects.yaml` | none | No | No |
| `classify_snippet` | HTTP POST | classifier `/classify` (loopback default) | `text` (free-form) | No | Loopback only, unless `KB_ALLOWED_HOSTS` widened |
| `search_notes` | HTTP GET | notes-api `/notes` (loopback default) | `query`, `tag` | No | Loopback only, unless `KB_ALLOWED_HOSTS` widened |

**Mitigations already present (verify, then credit in the writeup):**
- System-prompt spotlighting: tool results explicitly labeled untrusted
  DATA, not instructions.
- Host allowlist: target host derives from `projects.yaml` config, not
  from an LLM-supplied argument; defaults to loopback.
- `tool_choice` is not forced — the model can decline to call a tool,
  which matters for some injection classes (an attack that only works
  by forcing a specific call is weaker here than against a
  forced-tool-use pipeline like the classifier's ADR-002 design).

**Structural gap, not yet mitigated:**
- No apparent rate limit or max-tool-calls-per-turn cap visible from the
  fetch. If true, resource-exhaustion via repeated tool-call baiting is
  plausible and worth an explicit test even though it's low-severity.

## Threat scenarios

Numbered so the attack gold set (Phase 2) can reference these directly.

**T1 — Direct instruction override.** Injected note/KB text issues
imperative instructions ("ignore prior instructions, do X"). Mitigated
in principle by spotlighting; success = the model treats DATA as an
instruction anyway. *Test: does spotlighting actually hold, or is it a
soft preference the model overrides under pressure?*

**T2 — Authority/roleplay framing.** Injected text claims to be the
system, the admin, or a higher-priority instruction ("SYSTEM OVERRIDE:").
Same mitigation, same test shape as T1, different phrasing — worth
testing separately since framing style measurably changes success rate
in the literature.

**T3 — Tool-call baiting.** Injected text tries to make the model invoke
a tool it wouldn't otherwise, or with attacker-chosen arguments (e.g.
steer `classify_snippet`'s `text` param to carry exfiltration-shaped
content, or steer `search_notes`'s `tag` to enumerate/dump the KB).
Bounded by: no write tool exists, and the HTTP calls can't leave
loopback under default config — so success here should cap out at
"wasted/redirected local calls," not exfiltration. *Test the cap
explicitly: try to get either HTTP tool to target a non-loopback host
via injected content, confirm it's rejected.*

**T4 — Citation poisoning.** Injected content is engineered to get
itself cited as authoritative for a claim it doesn't actually support,
or to make the agent assert something false while citing a real,
unrelated source as if it backed the claim. No structural mitigation
observed — this is likely the highest-yield attack class to test, since
nothing above specifically defends against it.

**T5 — Field smuggling.** Payload placed in a field that might get less
scrutiny than body text — a note *title*, a KB chunk's source label, a
project name in `projects.yaml`. Tests whether spotlighting is applied
uniformly across all fields the tool returns, or only to the "obvious"
content field.

**T6 — Obfuscated payloads.** Base64, unicode homoglyphs, "translate the
following and then do what it says" wrappers. Tests whether spotlighting
survives content the model has to decode/transform before the injected
instruction becomes legible.

**T7 — Resource exhaustion.** Injected content tries to induce repeated
or expensive tool calls (e.g. "call search_kb 50 times with these
queries"). Tests the structural gap noted above.

## Severity, honestly

Given no write tool and default-loopback host restriction: **the
realistic worst case today is answer manipulation and citation
poisoning, not data exfiltration or destructive action.** That containment
is real and worth stating plainly in the eventual writeup — it's the
"good news" a purely alarmist framing would skip, and this site doesn't
skip inconvenient nuance in either direction.

The one condition that would change this materially: if `KB_ALLOWED_HOSTS`
is ever widened, or a write-capable tool is ever added (e.g. writing
tags back, per the-system's SYS-005 pattern extended to kb-agent), this
threat model's severity ceiling goes up and needs re-scoping. Worth a
one-line comment in the code near `KB_ALLOWED_HOSTS` pointing back at
this doc.

## Open questions to resolve against real source before Phase 2

1. Exact spelling/behavior of the host-allowlist check — is it a strict
   allowlist or a denylist-style loopback check? (Different bypass
   surface for each.)
2. Is there any tool-call count/rate limit per turn?
3. Does `search_notes`'s `tag` param get any validation, or could
   injected content cause it to enumerate more of the KB than a normal
   query would (an information-disclosure-via-legitimate-tool-misuse
   angle, distinct from T3)?
4. Confirm `tool_choice` is genuinely never forced anywhere in the
   agent's call sites, not just in the one function fetched.

## Decision: in/out of scope for the artifact

**In scope:** T1–T6 as the attack gold-set classes. T7 as a smaller,
separate check (resource exhaustion), not a full attack class with many
variants.

**Out of scope for v1:** model-level jailbreaking (attacking Claude
itself rather than the seam), attacking notes-api/classifier's own input
validation directly (their own systems, their own threat models),
supply-chain attacks on dependencies.
