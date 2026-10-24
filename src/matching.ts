export interface Hunk {
  readonly line: number;
}

export function parseHunks(diff: string): Hunk[] {
  const hunks: Hunk[] = [];
  const header = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
  for (const match of diff.matchAll(header)) {
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    // A deletion has no line on the modified side. Selecting the closest line
    // still makes the hunk visible in a native diff editor.
    hunks.push({ line: Math.max(0, count === 0 ? start - 1 : start - 1) });
  }
  return hunks;
}

export function matchesGlob(relativePath: string, pattern: string): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
  let expression = normalizedPattern.includes('/') ? '' : '(?:.*/)?';
  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const character = normalizedPattern[index];
    if (character === '*' && normalizedPattern[index + 1] === '*') {
      if (normalizedPattern[index + 2] === '/') {
        expression += '(?:.*/)?';
        index += 2;
      } else {
        expression += '.*';
        index += 1;
      }
    } else if (character === '*') {
      expression += '[^/]*';
    } else if (character === '?') {
      expression += '[^/]';
    } else {
      expression += character.replace(/[|\\{}()[\]^$+.]/g, '\\$&');
    }
  }
  return new RegExp(`^${expression}$`).test(normalizedPath);
}

export function isExcluded(relativePath: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => pattern.trim() !== '' && matchesGlob(relativePath, pattern.trim()));
}
