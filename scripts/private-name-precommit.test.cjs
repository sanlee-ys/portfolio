/*
 * Adversarial suite for private-name-precommit (Layer C). Synthetic private
 * names only — NEVER a real one (a real private name must not enter this public
 * repo; that's the whole reason C runs local, not in CI). Run:
 *
 *     node --test scripts/private-name-precommit.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { findPrivateNames } = require('./private-name-precommit.cjs');

// stand-in "private" repo names; not real. One is a common English word, to
// exercise the context-gating that keeps ordinary prose from firing.
const TERMS = ['synthavault', 'quietledger', 'ledger'];

test('a private name in an owner slug is flagged', () => {
  assert.deepEqual(findPrivateNames('see github.com/sanlee-ys/synthavault', TERMS), ['synthavault']);
});

test('a private name near a repo-context word is flagged', () => {
  assert.deepEqual(findPrivateNames('my quietledger repo is where I keep it', TERMS), ['quietledger']);
  assert.deepEqual(findPrivateNames('a github project called synthavault', TERMS), ['synthavault']);
});

test('a common-word private name in ordinary prose is NOT flagged (context-gated)', () => {
  assert.deepEqual(findPrivateNames('I keep a general ledger of my expenses', TERMS), []);
  assert.deepEqual(findPrivateNames('double-entry ledger accounting', TERMS), []);
});

test('the same common word IS flagged in a repo context', () => {
  assert.deepEqual(findPrivateNames('the ledger repository', TERMS), ['ledger']);
});

test('matching is case-insensitive', () => {
  assert.deepEqual(findPrivateNames('My SynthaVault GitHub repo', TERMS), ['synthavault']);
});

test('unrelated words are never flagged', () => {
  assert.deepEqual(findPrivateNames('a public github repo called portfolio', TERMS), []);
});

test('a slug .git suffix / trailing dot normalizes to the name', () => {
  assert.deepEqual(findPrivateNames('clone sanlee-ys/quietledger.git now.', TERMS), ['quietledger']);
});

test('empty term list yields no hits', () => {
  assert.deepEqual(findPrivateNames('github.com/sanlee-ys/synthavault repo', []), []);
});
