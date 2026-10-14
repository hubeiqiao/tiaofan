import type {Rating} from '@/lib/types';

/** Catalogue selection is presentation context; never infer it from which request finished. */
export const CATALOG_RATING_SOURCES = ['bgm', 'kitsu', 'mal'] as const;
export type CatalogRatingSource = typeof CATALOG_RATING_SOURCES[number];
export type RatingReadState = 'pending' | 'loading' | 'ready' | 'error';
export type RatingReadStates = Partial<Record<CatalogRatingSource, RatingReadState>>;
export const RATING_SOURCE_META = {
  bgm: {name: 'Bangumi', scale: 10},
  kitsu: {name: 'Kitsu', scale: 100},
  mal: {name: 'MAL', scale: 10},
} as const;
export type RatingPresentationStatus = 'rated' | 'no-rating' | 'pending' | 'loading' | 'missing' | 'error';
export type RatingProof = {
  source: CatalogRatingSource;
  name: string;
  scale: number;
  status: RatingPresentationStatus;
  /** Original source object, preserving count, date, cache qualifiers and provenance. */
  rating?: Rating;
};

function validScore(source: CatalogRatingSource, rating?: Rating): boolean {
  return rating?.score != null && Number.isFinite(rating.score)
    && rating.score >= 0 && rating.score <= RATING_SOURCE_META[source].scale;
}

/** No network, fallback score, source relabelling, date rewriting, or cross-source copying. */
export function catalogRatingPresentation(
  ratings: Readonly<Record<string, Rating>>,
  selected: CatalogRatingSource,
  states: RatingReadStates = {},
): {primary: RatingProof; secondary: RatingProof[]} {
  const rating = ratings[selected];
  const readState = states[selected] ?? 'pending';
  const status: RatingPresentationStatus = validScore(selected, rating) ? 'rated'
    : rating?.score === null ? 'no-rating'
    : readState === 'ready' ? 'missing' : readState;
  const primary: RatingProof = {source: selected, ...RATING_SOURCE_META[selected], status, ...(rating ? {rating} : {})};
  const secondary: RatingProof[] = CATALOG_RATING_SOURCES
    .filter(source => source !== selected && validScore(source, ratings[source]))
    .map(source => ({source, ...RATING_SOURCE_META[source], status: 'rated', rating: ratings[source]}));
  return {primary, secondary};
}
