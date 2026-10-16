/** Library membership is neutral until a viewing state or favorite is explicitly selected. */
export const WATCHLIST_STATES = ['saved', 'want', 'watching', 'done'] as const;
export type WatchlistState = typeof WATCHLIST_STATES[number];
export function isWatchlistState(value: unknown): value is WatchlistState {
  return typeof value === 'string' && (WATCHLIST_STATES as readonly string[]).includes(value);
}

export type Rating = {score:number|null;count:number|null;rank?:number;url:string;at?:string;note?:string;distribution?:Record<string,number>;scope?:string;cacheStale?:boolean;cacheDegraded?:boolean;sourceKey?:string;fetchedAt?:string};
export type SourceLink={name:string;url:string;kind?:'rating'|'review'|'info'|'watch';note?:string};
export type Stream={name:string;url:string;regions:string[]|null;broadcast?:string;site?:string;regionScope?:string;scope?:string;scopeLabel?:string;note?:string;availability?:string;provenance?:string;retrievedAt?:string;sourceUrl?:string};
export type Anime={recommendationFamilyKeys?:string[];key:string;bgm?:number;mal?:number;kitsuId?:string;imdb?:string;name:string;originalName?:string;aliases?:string[];image:string;summary:string;tags:string[];date:string;format:string;rating:Record<string,Rating>;broadcast?:string;streams?:Stream[];homepage?:string;homepageIsArchive?:boolean;state?:string;favorite?:boolean;end?:string;otherStatus?:string;sourceLinks?:SourceLink[];extraStreams?:SourceLink[];editorial?:{summary:string;watchPoints:string[];sourceUrl:string};language?:string;metadataDate?:string;episodes?:number;collection?:Record<string,number>;review?:ReviewEvidence;discussions?:Array<{id:string;title:string;url:string;replies:number;createdAt?:string;lastReplyAt?:string}>;reviewCoverage?:{status:string;reason:string;sourceUrl:string;checkedAt:string};playback?:PlaybackEvidence[];watchListings?:WatchListing[]};
export type IndividualReview={author:string;authorUrl?:string;source:string;sourceUrl:string;summary:string;rating?:number|null;ratingScale?:number|null;dateText?:string;stage?:string};
export type ReviewEvidence={individualReviews?:IndividualReview[];label:string;stage:string;sampleSize?:number;sampleDescription?:string;reviewers?:string[];strengths:string[];criticisms:string[];sources:Array<{name:string;url:string;publishedAt?:string|null;retrievedAt?:string;crawlRecencyAtRetrieval?:string;dateNote?:string}>};
// Each proof flag is independent. Missing/null values mean unknown; a sampled
// episode start cannot establish rights, region, full viewing or season coverage.
export type PlaybackEvidence={
  provider:string;url:string;episode?:string;
  official?:boolean|null;playbackVerified?:boolean|null;
  rightsVerified?:boolean|null;regionVerified?:boolean|null;
  verificationScope?:string|null;fullEpisodeViewed?:boolean|null;allEpisodesVerified?:boolean|null;
  checkedAt:string;regionObserved?:string|null;statusLabel?:string;note?:string;verification?:string;
};

export type WatchListing={id:string;provider:string;sourceUrl:string;sourceTitle:string;latestEpisode:string|null;latestPartEpisode?:number|null;partEpisodeCount?:number;partScopeNote?:string;latestUrl:string|null;episodes:Array<{label:string;url:string;publishedAt?:string;partEpisode?:number}>;listingCheckedAt:string|null;lastAttemptAt:string|null;listingAgeHours:number|null;stale:boolean;automaticCheckDue:boolean;nextAutomaticCheckEligibleAt:string|null;automaticQueuePosition:number|null;status:"available"|"failed"|"awaiting_check";error:string|null;refreshMode:"http"|"browser-required";automaticRefresh:boolean;automaticRefreshLimit:"bounded-source-batch"|"browser-required";verificationScope:"provider-episode-listing";observationMethod:"native-browser"|"public-html"|null;episodeAdvance?:{bgm:number;sourceId:string;episode:number;previousEpisode:number;observedAt:string;verificationScope:"integer-episode-advance"}};
