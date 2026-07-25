/*
 * Adversarial suite for the `Classify the review outcome` step in
 * .github/workflows/claude-review.yml. Run:
 *
 *     node --test scripts/classify-review-outcome.test.cjs
 *
 * WHY THIS EXISTS. ADR-005 has been amended four times and every amendment
 * closes the same way: "this change cannot test itself." Editing the workflow
 * makes the Claude App self-skip the review on that PR, so the only way to
 * exercise the step has been to merge it and open a throwaway PR — which tests
 * the *review*, not the classify step, and only ever on the one path that run
 * happened to take. Amendment 2 shipped a counter that could not count and
 * Amendment 3 a name that could not distinguish; both were invisible for want
 * of a way to run the thing against a known input.
 *
 * This runs the step's REAL text — extracted from the YAML, not a copy that
 * can drift — against synthetic execution logs, with `gh` stubbed so nothing
 * touches the network or a PR. It asserts on the three things the step is
 * responsible for: its exit code, what it logged, and what it posted.
 *
 * NO NEW DEPENDENCY. The extraction is a line scan rather than a YAML parse:
 * `qa.yml` already refuses to grow a Python toolchain for a doc linter, and
 * a test harness is not a better reason than that one was. The block is a
 * literal scalar (`run: |`), so dedenting by the first body line's indent is
 * exactly what a YAML parser would do to it, and extractRunBlock throws rather
 * than guessing if the shape it expects is gone.
 *
 * REQUIRES bash and jq — both are on the ubuntu runner and in Git Bash on
 * Windows. The test SKIPS (it does not pass) if either is missing, because a
 * silent pass on an unrun gate is the exact failure CLAUDE.md warns about for
 * the mobile gate.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'claude-review.yml');
const STEP_NAME = 'Classify the review outcome';

// ---- Extract the step's script from the workflow ---------------------------

/**
 * Pull the `run:` literal block out of the step named `stepName`.
 * Throws if the step, or its `run: |`, or its body is not where we expect —
 * a harness that silently tests nothing is worse than one that fails loudly.
 */
function extractRunBlock(yamlText, stepName) {
  // Normalize CRLF first. This repo is developed on Windows with
  // `core.autocrlf=true`, so the working-tree copy is CRLF while the blob and
  // the ubuntu runner are LF. Without this the harness hands bash a script
  // with a `\r` on every line -- which happened to run, so the bug would have
  // surfaced later as a mystery failure on someone else's shell and read as a
  // defect in the workflow rather than in this file.
  const lines = yamlText.replace(/\r\n/g, '\n').split('\n');
  const nameIdx = lines.findIndex((l) => l.trim() === `- name: ${stepName}`);
  if (nameIdx === -1) throw new Error(`step "${stepName}" not found in ${WORKFLOW}`);

  // The step's own keys sit at the indent of `name:` (one past the `- `).
  const stepIndent = lines[nameIdx].indexOf('- name:') + 2;
  let runIdx = -1;
  for (let i = nameIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const indent = line.length - line.trimStart().length;
    if (indent < stepIndent) break; // left the step without finding `run:`
    if (indent === stepIndent && line.trim() === 'run: |') { runIdx = i; break; }
  }
  if (runIdx === -1) throw new Error(`step "${stepName}" has no \`run: |\` block`);

  const body = [];
  let baseIndent = null;
  for (let i = runIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { body.push(''); continue; }
    const indent = line.length - line.trimStart().length;
    if (baseIndent === null) {
      if (indent <= stepIndent) throw new Error(`\`run: |\` block for "${stepName}" is empty`);
      baseIndent = indent;
    }
    if (indent < baseIndent) break; // block scalar ended
    body.push(line.slice(baseIndent));
  }
  // Trailing blank lines are the gap before the next key, not script.
  while (body.length && body[body.length - 1] === '') body.pop();
  return body.join('\n');
}

const SCRIPT = extractRunBlock(fs.readFileSync(WORKFLOW, 'utf8'), STEP_NAME);

// ---- Harness ---------------------------------------------------------------

function have(cmd) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: false });
  return !r.error && r.status === 0;
}
const CAN_RUN = have('bash') && have('jq');

/**
 * Run the extracted step against one synthetic execution log.
 *
 * `verdictComments` is what the stubbed `gh pr view` reports for "how many
 * comments did claude author" — the Amendment 3 signal that separates a
 * denial the review survived from one that silenced it.
 *
 * Returns { status, stdout, stderr, comment } where `comment` is the body the
 * step posted via `gh pr comment`, or null if it posted nothing.
 */
function runStep(execLog, { verdictComments = 0, stepOutcome = 'success', omitExecFile = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classify-'));
  try {
    const execFile = path.join(dir, 'execution.json');
    fs.writeFileSync(execFile, JSON.stringify(execLog));
    const commentFile = path.join(dir, 'comment.txt');
    const scriptFile = path.join(dir, 'step.sh');
    fs.writeFileSync(scriptFile, SCRIPT);

    // `gh` stub. Records the comment body; answers the verdict probe with a
    // count. Nothing here touches the network.
    const binDir = path.join(dir, 'bin');
    fs.mkdirSync(binDir);
    fs.writeFileSync(path.join(binDir, 'gh'), [
      '#!/usr/bin/env bash',
      'if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then',
      '  shift 3',                      // drop `pr comment <number>`
      '  while [ "$1" != "--body" ] && [ $# -gt 0 ]; do shift; done',
      '  printf "%s" "$2" > "$GH_STUB_COMMENT"',
      '  exit 0',
      'fi',
      'if [ "$1" = "pr" ] && [ "$2" = "view" ]; then',
      '  printf "%s\\n" "$GH_STUB_VERDICT_COMMENTS"',
      '  exit 0',
      'fi',
      'echo "gh stub: unexpected invocation: $*" >&2',
      'exit 1',
    ].join('\n'), { mode: 0o755 });

    const r = spawnSync('bash', [scriptFile], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        GH_TOKEN: 'stub-token',
        PR: '999',
        EXEC_FILE: omitExecFile ? '' : execFile,
        STEP_OUTCOME: stepOutcome,
        RUN_URL: 'https://example.invalid/run/1',
        GITHUB_RUN_ID: '1',
        GH_STUB_COMMENT: commentFile,
        GH_STUB_VERDICT_COMMENTS: String(verdictComments),
      },
    });
    return {
      status: r.status,
      stdout: r.stdout || '',
      stderr: r.stderr || '',
      comment: fs.existsSync(commentFile) ? fs.readFileSync(commentFile, 'utf8') : null,
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** A minimal SDK result message, shaped like the saved execution log. */
function resultLog({ subtype = 'success', turns = 10, denials = [], cost = 0.1 } = {}) {
  return [
    { type: 'system', subtype: 'init' },
    {
      type: 'result',
      subtype,
      num_turns: turns,
      total_cost_usd: cost,
      permission_denials: denials,
    },
  ];
}

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

// ---- Tests -----------------------------------------------------------------

describe('Classify the review outcome', { skip: CAN_RUN ? false : 'needs bash and jq on PATH' }, () => {
  test('clean review: green, no comment', () => {
    const r = runStep(resultLog({ turns: 22 }));
    assert.equal(r.status, 0);
    assert.match(r.stdout, /subtype=success turns=22 denials=0/);
    assert.equal(r.comment, null);
  });

  test('self-skip (no execution file, step succeeded): green, nothing classified', () => {
    const r = runStep(resultLog(), { omitExecFile: true });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /skipped itself/);
    assert.equal(r.comment, null);
  });

  test('no execution file after a failed step: red', () => {
    const r = runStep(resultLog(), { omitExecFile: true, stepOutcome: 'failure' });
    assert.equal(r.status, 1);
  });

  test('denied into silence: red, and the comment names the commands', () => {
    const r = runStep(
      resultLog({ turns: 7, denials: [bash('node scripts/link-check.cjs'), bash('ls -la')] }),
      { verdictComments: 0 },
    );
    assert.equal(r.status, 1);
    // Amendment 4's whole point: the CALL, not the class.
    assert.match(r.comment, /Bash: node scripts\/link-check\.cjs/);
    assert.match(r.comment, /Bash: ls -la/);
    assert.doesNotMatch(r.comment, /could not be extracted/);
  });

  test('denial the review survived: green, warning names the commands', () => {
    const r = runStep(
      resultLog({ turns: 34, denials: [bash('gh pr checks 122')] }),
      { verdictComments: 1 },
    );
    assert.equal(r.status, 0);
    assert.match(r.stdout, /::warning::.*Bash: gh pr checks 122/);
    assert.equal(r.comment, null);
  });

  test('non-Bash denials render their own input field', () => {
    const r = runStep(
      resultLog({
        denials: [
          { tool_name: 'Read', tool_input: { file_path: 'assets/style.css' } },
          { tool_name: 'Grep', tool_input: { pattern: 'private-repo' } },
          { tool_name: 'WebFetch', tool_input: { url: 'https://example.invalid/x' } },
        ],
      }),
      { verdictComments: 1 },
    );
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Read: assets\/style\.css/);
    assert.match(r.stdout, /Grep: private-repo/);
    assert.match(r.stdout, /WebFetch: https:\/\/example\.invalid\/x/);
  });

  test('a denial with no recognized input degrades to the tool name alone', () => {
    const r = runStep(
      resultLog({ denials: [{ tool_name: 'Bash', tool_input: { timeout: 5 } }] }),
      { verdictComments: 1 },
    );
    assert.equal(r.status, 0);
    assert.match(r.stdout, /denied_calls: Bash$/m);
  });

  test('turn exhaustion: green, and the comment says nothing was reviewed', () => {
    const r = runStep(resultLog({ subtype: 'error_max_turns', turns: 40 }));
    assert.equal(r.status, 0);
    assert.match(r.stdout, /::warning::Review inconclusive/);
    assert.match(r.comment, /Nothing in this PR has been reviewed/);
  });

  test('an unknown subtype is an execution failure: red', () => {
    const r = runStep(resultLog({ subtype: 'error_during_execution' }));
    assert.equal(r.status, 1);
    assert.match(r.stderr + r.stdout, /::error::/);
  });

  // The regression this suite was opened for. One malformed denial element
  // used to take the whole extraction down with it: the jq program was
  // guarded at the whole-program level (`|| echo '[]'`), so a `tool_input`
  // that is not an object errored the program and discarded the commands for
  // every OTHER denial too. The comment then said "could not be extracted --
  // see the job log", pointing the reader at a log that does not have them
  // either (`show_full_output` is off) — on the red path, where the commands
  // are the only thing there is to act on.
  test('one malformed denial does not discard the others', () => {
    const r = runStep(
      resultLog({
        turns: 9,
        denials: [
          { tool_name: 'Bash', tool_input: 'not-an-object' },
          bash('gh pr checks 122'),
        ],
      }),
      { verdictComments: 0 },
    );
    assert.equal(r.status, 1);
    assert.match(r.comment, /Bash: gh pr checks 122/);
    assert.doesNotMatch(r.comment, /could not be extracted/);
  });

  test('a denial with no tool_input at all still names its tool', () => {
    const r = runStep(
      resultLog({ denials: [{ tool_name: 'Bash' }, bash('gh pr checks 122')] }),
      { verdictComments: 1 },
    );
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Bash: gh pr checks 122/);
  });

  test('a long command is truncated, not dropped', () => {
    const long = `node ${'x'.repeat(300)}`;
    const r = runStep(resultLog({ denials: [bash(long)] }), { verdictComments: 1 });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Bash: node x+\.\.\./);
    // 160-char cap on the input, plus "Bash: " and the ellipsis.
    const line = r.stdout.split('\n').find((l) => l.startsWith('denied_calls:'));
    assert.ok(line.length < 200, `expected a truncated line, got ${line.length} chars`);
  });

  test('a backtick in a denied command does not break the code block', () => {
    const r = runStep(
      resultLog({ denials: [bash('echo `whoami`')] }),
      { verdictComments: 0 },
    );
    assert.equal(r.status, 1);
    // Indented code block (four spaces), so a backtick needs no escaping.
    assert.match(r.comment, /^ {4}Bash: echo `whoami`$/m);
  });

  test('a newline in a denied command collapses to one line', () => {
    const r = runStep(
      resultLog({ denials: [bash('node a.cjs\nnode b.cjs')] }),
      { verdictComments: 1 },
    );
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Bash: node a\.cjs node b\.cjs/);
  });
});
