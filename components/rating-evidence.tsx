import {hasFewRatings, ratingCountLabel, ratingCountQualification} from '@/lib/catalog-evidence-context';

type RatingEvidenceProps = {
  source: string;
  /** Catalog source key; the display name does not determine count semantics. */
  sourceKey?: string;
  score: number;
  scale: number;
  count?: number | null;
  locale: 'zh' | 'en' | 'ja';
  lowCount?: boolean;
};

/** Source-backed text only. The caller owns links, actions, and source dates. */
export function RatingEvidence({source, sourceKey, score, scale, count, locale, lowCount}: RatingEvidenceProps) {
  const fewRatings = lowCount ?? hasFewRatings({count: count ?? null});

  return <span className="rating-evidence">
    <span className="rating-evidence-main">
      <span className="rating-evidence-source">{source}</span>{' '}
      <span className="rating-evidence-score">{score.toFixed(1)}<span className="rating-evidence-scale">/{scale}</span></span>
    </span>{' '}
    <span className="rating-evidence-context">
      <span className="rating-evidence-count">{ratingCountLabel(count, locale, sourceKey)}</span>
      {fewRatings && <>{' '}<span className="rating-evidence-separator" aria-hidden="true">·</span>{' '}<span className="rating-evidence-qualification">{ratingCountQualification(locale, sourceKey)}</span></>}
    </span>
  </span>;
}
