#!/usr/bin/env python3
"""Audit: does every character in the built copy have a self-hosted glyph?

The failure this exists to catch is invisible three ways at once. A codepoint
the fonts do not carry still RENDERS -- the browser silently borrows it from a
platform face -- so it survives every link, markup and mobile gate, it looks
fine on the machine that wrote it, and it changes shape on someone else's
laptop. U+2192 shipped that way for months: the proof figures and the card
links were drawing two different arrows on one page, from two different
platform fonts, and nothing was red.

It reports three things per non-ASCII codepoint used in dist/ (plus the
standalone public/resume.html, which carries its own @font-face rules):

  covered      a declared unicode-range AND the woff2 behind it both have it
  DECLARED-ONLY  the CSS range claims it, the file does not -- the bug class
                 where a range is widened without re-cutting the subset
  UNCOVERED    no self-hosted face has it; it falls to --symbol-tail and the
                 platform draws it

UNCOVERED is not automatically a defect. Three are known and deliberate --
U+03BA on the judge page and the theme toggle's U+2600 / U+263D, none of which
exist in Geist, Geist Mono or Newsreader upstream. They are listed in EXPECTED
below. Anything UNCOVERED and not expected is a real finding: either add the
codepoint to scripts/subset-fonts.py and re-cut, or add it here with a reason.

DECLARED-ONLY is always a defect -- it means style.css and the woff2 files
disagree, which is exactly the drift this pair of scripts exists to prevent.

Run after a build, from the repo root:

    npm run build
    uv run --with "fonttools[woff]" python scripts/font-coverage.py

Exits non-zero on an unexpected UNCOVERED or any DECLARED-ONLY. Not wired into
`npm run qa`: the gates run in CI without a Python font toolchain, and a local
runner that checks more than CI is the inverse of the trap CLAUDE.md warns
about but still a divergence. Run it by hand when you touch fonts or add a
symbol to the copy.
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parent.parent
FONTS = REPO / "public" / "assets" / "fonts"
DIST = REPO / "dist"

# Codepoints known to have no glyph in any upstream face here, with the reason.
EXPECTED = {
    0x03BA: "kappa: the judge page's agreement statistic; no Greek in any of the three faces",
    0x2600: "sun: theme toggle; no dingbats in any of the three faces",
    0x263D: "moon: theme toggle; no dingbats in any of the three faces",
}

# Stylesheets that declare @font-face, and the directory each one's url() is
# relative to. resume.html is standalone by design (see CLAUDE.md) and repeats
# the Geist declarations, so it drifts independently and is checked separately.
SHEETS = [
    (REPO / "public" / "assets" / "style.css", REPO / "public" / "assets"),
    (REPO / "public" / "resume.html", REPO / "public"),
]

FACE_RE = re.compile(r"@font-face\s*\{(.*?)\}", re.S)


def parse_ranges(spec: str) -> set[int]:
    cps: set[int] = set()
    for tok in spec.split(","):
        tok = tok.strip().upper().removeprefix("U+")
        if not tok:
            continue
        if "-" in tok:
            a, b = tok.split("-")
            cps.update(range(int(a, 16), int(b, 16) + 1))
        else:
            cps.add(int(tok, 16))
    return cps


def load_faces() -> list[tuple[str, str, Path, set[int], set[int]]]:
    faces = []
    for sheet, base in SHEETS:
        text = sheet.read_text(encoding="utf-8")
        for block in FACE_RE.findall(text):
            fam = re.search(r'font-family:\s*"([^"]+)"', block)
            url = re.search(r'url\("([^"]+)"\)', block)
            rng = re.search(r"unicode-range:\s*([^;]+);", block)
            if not (fam and url and rng):
                continue
            style = re.search(r"font-style:\s*(\w+)", block)
            path = (base / url.group(1)).resolve()
            if not path.exists():
                raise SystemExit(f"{sheet.name}: @font-face points at a missing file: {path}")
            font = TTFont(str(path))
            cmap = set(font.getBestCmap().keys())
            font.close()
            label = f"{fam.group(1)}/{style.group(1) if style else 'normal'}"
            faces.append((label, sheet.name, path, parse_ranges(rng.group(1)), cmap))
    return faces


class Copy(HTMLParser):
    """Visible text only: <script>/<style> bodies are code, not copy."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.found: dict[int, tuple[str, str]] = {}
        self.where = ""

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if self.skip:
            return
        for ch in data:
            cp = ord(ch)
            if cp > 0x7F and cp not in self.found:
                self.found[cp] = (self.where, " ".join(data.split())[:70])


def main() -> None:
    if not DIST.is_dir():
        raise SystemExit("dist/ not found -- run `npm run build` first")
    pages = sorted(DIST.rglob("*.html"))
    if not pages:
        raise SystemExit("dist/ has no pages -- the build produced nothing to audit")

    faces = load_faces()
    copy = Copy()
    for page in pages + [REPO / "public" / "resume.html"]:
        copy.where = str(page.relative_to(REPO)).replace("\\", "/")
        copy.feed(page.read_text(encoding="utf-8"))

    print(f"{len(faces)} @font-face declarations, {len(pages)} built pages "
          f"+ public/resume.html\n")

    declared_only: list[str] = []
    unexpected: list[str] = []

    for cp in sorted(copy.found):
        page, snippet = copy.found[cp]
        covered = sorted({lbl for lbl, _, _, rng, cmap in faces if cp in rng and cp in cmap})
        claimed = sorted({f"{lbl} ({sheet})" for lbl, sheet, _, rng, cmap in faces
                          if cp in rng and cp not in cmap})
        char = chr(cp) if cp not in (0xA0,) else "nbsp"

        if claimed:
            declared_only.append(f"U+{cp:04X} {char} -- declared by {', '.join(claimed)}")
        if covered:
            print(f"  U+{cp:04X} {char:>4}  covered   {', '.join(covered)}")
        elif cp in EXPECTED:
            print(f"  U+{cp:04X} {char:>4}  expected  {EXPECTED[cp]}")
        else:
            unexpected.append(f"U+{cp:04X} {char} -- {page}: {snippet!r}")
            print(f"  U+{cp:04X} {char:>4}  UNCOVERED {page}")

    ok = True
    if declared_only:
        ok = False
        print("\nDECLARED-ONLY -- a unicode-range claims a codepoint its woff2 lacks.")
        print("Re-cut with scripts/subset-fonts.py, or narrow the range:")
        for line in declared_only:
            print(f"  {line}")

    if unexpected:
        ok = False
        print("\nUNCOVERED and unexpected -- the platform is drawing these, so they")
        print("change shape between machines. Add them to scripts/subset-fonts.py")
        print("and re-cut, or record them in EXPECTED here with a reason:")
        for line in unexpected:
            print(f"  {line}")

    if ok:
        print("\nOK - every non-ASCII character in the copy is either self-hosted "
              "or a recorded exception.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
