/**
 * Finds the first currently navigable key after (or before) a key that was
 * removed from the change list, such as when the user stages that file.
 */
export function findContinuationIndex(
  previousKeys: readonly string[],
  currentKey: string,
  currentKeys: readonly string[],
  direction: 1 | -1
): number {
  const previousIndex = previousKeys.indexOf(currentKey);
  if (previousIndex === -1) {
    return -1;
  }

  for (let offset = 1; offset < previousKeys.length; offset += 1) {
    const index = (previousIndex + (direction * offset) + previousKeys.length) % previousKeys.length;
    const currentIndex = currentKeys.indexOf(previousKeys[index]);
    if (currentIndex !== -1) {
      return currentIndex;
    }
  }

  return -1;
}
