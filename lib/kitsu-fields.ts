/** Kitsu's count describes its exact source entry, which may cover several BGM parts. */
export function kitsuEpisodeCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
