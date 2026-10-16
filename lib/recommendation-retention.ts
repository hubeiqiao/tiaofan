import type {Anime} from './types';

const aliases=(row:Anime)=>[row.key,row.bgm?`bgm:${row.bgm}`:'',row.mal?`mal:${row.mal}`:'',row.kitsuId?`kitsu:${row.kitsuId}`:''].filter(Boolean);
/** Recheck current membership synchronously while the server recomputes matches.
 * Family keys are projected from the public source graph, never inferred by title.
 * This only removes candidates. It cannot invent a match or update source dates.
 */
export function remainingRecommendations<T extends Anime>(rows:readonly T[],saved:readonly Anime[]):T[]{
 const blocked=new Set(saved.flatMap(aliases));
 return rows.filter(row=>![...aliases(row),...(row.recommendationFamilyKeys||[])].some(key=>blocked.has(key)));
}
