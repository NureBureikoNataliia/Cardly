export function shouldAnimateCardChange(
  previousCardId: string | null | undefined,
  nextCardId: string | null | undefined,
): boolean {
  if (!previousCardId || !nextCardId) return false;
  return previousCardId !== nextCardId;
}
