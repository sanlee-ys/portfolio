# ADR-011: The public career tell stays short

**Status:** Accepted; amended 2026-08-20
**Date:** 2026-08-17
**Deciders:** San Lee

---

## Context

The site roadmap held an open item: "Career-story depth." The About section
told the side-project story. The résumé held titles, dates, and scale. A
review asked for a fuller public arc (Army to merchant command to infra to
MBA to product) so a hiring manager could read the career on the homepage.

That size is the wrong size. The site is public and indexed. More color
about units, teams, and internal products is how people get found. It also
pushes the voice toward a hero story the owner does not claim. The Army
service was not special operations. The JPMorganChase years were one person
in a large machine, not a rare seat.

The résumé already carries the factual spine. The room can hold longer
stories. Those stay in the private narrative bank. They are spoken, not
indexed.

## Decision

**Public career copy stays at résumé facts plus the approved About tell.
It does not grow.**

The About tell, locked 2026-08-17:

> Seven years in infra and operations at the same firm, then a product seat
> on a collaboration platform. I was one person in a large machine. I built
> the public system to own a full loop I did not own at work.

Ceiling for anything public:

- Army: what the résumé already states (Corporal, team lead, SECFOR in
  Qatar, honorable discharge). No unit, no mission color, no implied
  special operations.
- Employer: title, platform, firm-wide scale, and the merchant-command
  line already on the résumé. No team names, no feature list, no claim
  of a rare or unique role.
- Do not call the author rare. Do not add biography, photo essays, or a
  new career page.

A later session that "helps" by adding color is out of bounds. Route a
longer story to the private narrative bank, or leave it unsaid.

## Downstream surfaces

- `CLAUDE.md` — operative instruction. Canonical for what to write. This
  ADR is canonical for why.
- `src/pages/index.astro` — About section holds the locked tell.
- `public/resume.html` — factual spine. Do not thicken it as a side
  effect of other work.
- `ROADMAP.md` — career-story depth item closes as a ceiling, not as a
  memoir.
- Private `desk/materials/interview-narrative-bank.md` — spoken stories
  stay there. Do not promote them onto this site.

## Consequences

- A hiring manager who wants more opens the résumé or asks in the room.
- The public site cannot be the full TPM packet. That is accepted.
- Nothing enforces this in CI. The rule holds only if agents read
  `CLAUDE.md` before they edit copy.
- The hero line that already names the firm and the 300,000-employee
  platform stays. This ADR does not rewrite existing résumé-scale facts.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| A full public career page (Army to product) | Indexed detail without a hiring need. Doxxing risk. Hero voice the owner rejected. |
| Leave About as side-project only | The résumé then has to carry the whole arc. Two short sentences close the hole without a page. |
| Expand the résumé Leadership or Experience bullets | Same color problem on a page people download and file. |

## Amendment (2026-08-20): one short About page

A dedicated `about.html` is permitted as the single home of the locked tell.
This supersedes only the original prohibition on a new career page; it does not
raise the career-story ceiling. About stays short, uses only the public facts
allowed above, and does not become a timeline, memoir, or photo essay.

Downstream ownership moves from `src/pages/index.astro` to
`src/pages/about.astro`. The homepage may retain a short version of the tell and
link to About, but must not duplicate or expand the biography. Any claim about
who built the site remains subject to [`ADR-002`](ADR-002-ai-use-posture.md):
name Claude plainly and describe directed work rather than using a vague AI
credit.
