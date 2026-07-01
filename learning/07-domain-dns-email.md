# Lesson 07 — The domain: DNS, CNAMEs, and email without a mail server

**Tier 0 (plumbing) · how sanlee.me serves this site from GitHub Pages and
receives mail at `hi@sanlee.me` with no mail server and no paid plan.**

## Concept

A domain is a key-value store with **typed records**, and the types are
independent lanes: `A`/`CNAME` route the web, `MX` routes mail, `TXT` holds
proofs and policies. One domain can do all three at once because changing one
lane never touches the others.

## The why

I vaguely remembered CNAMEs from my dev-team days — pointing an app's DNS name
at a load balancer's hostname. That memory turns out to be the whole mental
model:

- An **`A` record** says *"this name lives at this IP."*
- A **`CNAME` record** says *"this name is an alias for that name — go ask
  again over there."*

The reason we CNAME'd to the load balancer instead of its IPs is the same
reason GitHub Pages wants a name-level pointer: **the target's IPs can change
without you touching your record.** The LB re-IPs, the alias still resolves.
GitHub Pages is that exact move at internet scale — my name points at their
infrastructure, and they re-address it freely behind the alias.

One rule I didn't know: **the apex (root) of a domain can't be a CNAME.** The
DNS spec forbids it, because a CNAME can't coexist with the other records the
apex must hold (and mail's `MX` lives there too). So the standard GitHub Pages
setup is `A` records at the apex pointing to GitHub's published IPs, while a
subdomain like `www` is free to CNAME to `<user>.github.io`.

## How it works (the two halves of the web side)

Serving a custom domain from GitHub Pages needs both sides to agree:

- **DNS side (Namecheap):** records that send browsers for `sanlee.me` to
  GitHub's servers. This lives at the registrar, *not* in the repo — the one
  part of the site that isn't version-controlled here.
- **Repo side (`CNAME` file):** a one-line file containing `sanlee.me`, which
  tells GitHub *which hostname this repo answers for*.

Gotcha worth naming: the repo's **`CNAME` file** and a **DNS `CNAME` record**
are different things that share a name. The file is GitHub's routing config;
the record is DNS aliasing. You can (as here) use the `CNAME` file with `A`
records and no DNS CNAME at all.

## Email without a mail server

This was the part I'd never done. `hi@sanlee.me` works with **no mailbox on the
domain at all**:

- Namecheap's free **Email Forwarding** (Advanced DNS → Mail Settings) auto-adds
  its `MX` records — the lane that tells sending servers where mail for the
  domain goes.
- A **Redirect Email** rule maps the alias `hi` → my real inbox. The public
  address is branded and scrape-safe; the real mailbox stays private.
- It's **receive-only**: replies go out from the real address, not `hi@`.
  Sending *as* the domain is the part that needs a paid mail plan somewhere
  (plus `TXT`-lane policies like SPF/DKIM so receivers trust it). A contact
  link doesn't need any of that.
- A catch-all (`*@sanlee.me`) is one more rule away — every invented address
  becomes a disposable alias, the same per-purpose alias habit I already use.

The insight that made it click: **adding email never risked the live site.**
`MX` and `A` are separate lanes on the same domain; I kept double-checking that
the mail setup wouldn't break the web records, and the record model is *why* it
can't.

## Takeaways

- **DNS is a typed key-value store; the types are independent lanes.** Web,
  mail, and policy records coexist on one name without interference.
- **CNAME = alias, same as the load-balancer days.** Point at a name, not an
  IP, so the target can re-address itself under you.
- **The apex can't CNAME** — hence `A` records at the root, CNAME on
  subdomains.
- **Repo `CNAME` file ≠ DNS `CNAME` record.** Same word, two systems.
- **Receiving mail is free; sending as the domain is what costs.** For a
  contact address, forwarding is the whole job.
- **Propagation and CDN caches lie to you for a while.** New records take
  minutes-to-hours; GitHub Pages' CDN can serve stale CSS after a deploy.
  "It doesn't work yet" and "it's wrong" are different states — wait, then
  hard-refresh, before re-diagnosing.

## Files

- `CNAME` — the repo half: one line, `sanlee.me`
- The DNS half lives at Namecheap (apex `A` records to GitHub Pages, `MX` +
  forwarding rule for mail) — configured in the registrar dashboard, not in git
- `index.html` / `resume.html` — where `hi@sanlee.me` is actually used
