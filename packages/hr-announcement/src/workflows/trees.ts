export function collectSubtreeIds(
  items: { id: string; parentId: string | null }[],
  rootIds: string[],
): string[] {
  const childrenByParent = new Map<string | null, string[]>();
  for (const item of items) {
    const siblings = childrenByParent.get(item.parentId) ?? [];
    siblings.push(item.id);
    childrenByParent.set(item.parentId, siblings);
  }

  const result = new Set<string>(rootIds);
  const stack = [...rootIds];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }
  return [...result];
}
