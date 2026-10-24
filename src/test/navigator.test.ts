import assert from 'node:assert/strict';
import test from 'node:test';
import { isExcluded, matchesGlob, parseHunks } from '../matching';
import { compareChanges } from '../ordering';
import { findContinuationIndex } from '../continuation';

test('parses added-side hunk locations as zero-based lines', () => {
  assert.deepEqual(parseHunks('@@ -1,0 +1,2 @@\n+one\n+two\n@@ -9 +11 @@\n+three\n'), [{ line: 0 }, { line: 10 }]);
});

test('uses Source Control list ordering: files before folders at the same depth', () => {
  const changes = [
    { relativePath: 'scripts/package.mjs' },
    { relativePath: 'README.md' },
    { relativePath: 'tsconfig.json' },
    { relativePath: 'src/extension.ts' }
  ];
  assert.deepEqual([...changes].sort((left, right) => compareChanges(left, right, 'list')).map((change) => change.relativePath), [
    'README.md', 'tsconfig.json', 'scripts/package.mjs', 'src/extension.ts'
  ]);
});

test('uses Source Control tree ordering: folders before files at the same depth', () => {
  const changes = [
    { relativePath: 'scripts/package.mjs' },
    { relativePath: 'README.md' },
    { relativePath: 'tsconfig.json' },
    { relativePath: 'src/extension.ts' }
  ];
  assert.deepEqual([...changes].sort((left, right) => compareChanges(left, right, 'tree')).map((change) => change.relativePath), [
    'scripts/package.mjs', 'src/extension.ts', 'README.md', 'tsconfig.json'
  ]);
});

test('matches repository-relative globs', () => {
  assert.equal(matchesGlob('src/generated/file.ts', '**/generated/**'), true);
  assert.equal(matchesGlob('nested/package-lock.json', '*.lock'), false);
  assert.equal(matchesGlob('nested/app.lock', '*.lock'), true);
  assert.equal(matchesGlob('package-lock.json', '*.lock'), false);
  assert.equal(isExcluded('dist/app.js', ['**/dist/**', '*.map']), true);
  assert.equal(isExcluded('src/app.ts', ['**/dist/**', '*.map']), false);
});

test('continues after a staged current file instead of restarting', () => {
  const previousKeys = ['unstaged:README', 'unstaged:tsconfig', 'unstaged:scripts/package'];
  const remainingKeys = ['unstaged:README', 'unstaged:scripts/package'];
  assert.equal(findContinuationIndex(previousKeys, 'unstaged:tsconfig', remainingKeys, 1), 1);
  assert.equal(findContinuationIndex(previousKeys, 'unstaged:tsconfig', remainingKeys, -1), 0);
});

test('wraps continuation when the last current file is staged', () => {
  const previousKeys = ['unstaged:README', 'unstaged:tsconfig', 'unstaged:scripts/package'];
  const remainingKeys = ['unstaged:README', 'unstaged:tsconfig'];
  assert.equal(findContinuationIndex(previousKeys, 'unstaged:scripts/package', remainingKeys, 1), 0);
});
