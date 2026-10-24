export type ScmViewMode = 'list' | 'tree';

export interface SortableChange {
  readonly relativePath: string;
}

function compareName(left: string, right: string): number {
  const insensitive = left.localeCompare(right, undefined, { sensitivity: 'accent' });
  return insensitive || left.localeCompare(right);
}

/**
 * Reproduces the Source Control resource tree ordering. In list mode a file
 * precedes a folder at the same depth; in tree mode the folder precedes it.
 */
export function compareChanges(left: SortableChange, right: SortableChange, viewMode: ScmViewMode): number {
  const leftParts = left.relativePath.split('/');
  const rightParts = right.relativePath.split('/');

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === rightPart) {
      continue;
    }

    const leftIsLeaf = index === leftParts.length - 1;
    const rightIsLeaf = index === rightParts.length - 1;
    if (leftIsLeaf === rightIsLeaf) {
      return compareName(leftPart ?? '', rightPart ?? '');
    }

    return viewMode === 'list'
      ? (leftIsLeaf ? -1 : 1)
      : (leftIsLeaf ? 1 : -1);
  }

  return compareName(left.relativePath, right.relativePath);
}
