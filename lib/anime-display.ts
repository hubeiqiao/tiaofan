import type {Anime,Stream,SourceLink} from './types';
import {displayTitle} from './title-fallback';
export type Meta={name:string;originalName?:string;aliases?:string[];mal?:string;conflicts?:{mal?:unknown};broadcast?:string;end?:string;streams?:Stream[];homepage?:string;homepageIsArchive?:boolean;sourceLinks?:SourceLink[];extraStreams?:SourceLink[];editorial?:{summary:string;watchPoints:string[];sourceUrl:string};language?:string;metadataDate?:string;imdb?:string;review?:Anime['review'];discussions?:Anime['discussions'];reviewCoverage?:Anime['reviewCoverage'];playback?:Anime['playback'];watchListings?:Anime['watchListings']};
type Rich=Anime;
// Only public alias claims needed by the conservative saved-title identity check.
// Include the entire fetched cohort, even titles hidden by the current UI filter.
export function publicIdentityMeta(items:Record<string,Meta>):Record<string,Meta>{return Object.fromEntries(Object.entries(items).filter(([id])=>/^[1-9]\d{0,11}$/.test(id)).map(([id,m])=>[id,{name:'',...(/^[1-9]\d{0,11}$/.test(String(m.mal||''))?{mal:String(m.mal)}:{}),...(m.conflicts?.mal?{conflicts:{mal:true}}:{})}]))}
const exactStage=(a:Rich)=>[639938,551918].includes(a.bgm||0);
function chinese(s:string){return /\p{Script=Han}/u.test(s)&&!/[\u3040-\u30ff]/.test(s)}
// The Chinese UI already chooses the sourced editorial text when the raw
// synopsis is Japanese. Avoid sending both versions in the initial SSR props.
// Keep the original whenever it is displayed or no editorial fallback exists.
export function compactSeedRow(a:Rich):Rich{const displayed=(a.summary||'').replace(/\[.*?\]/g,'').replace(/<[^>]+>/g,'').trim();return !chinese(displayed)&&a.editorial?.summary?{...a,summary:a.editorial.summary}:a}
export function mergeMeta(a:Rich,m?:Meta):Rich{return m?{...a,aliases:m.aliases||a.aliases,name:displayTitle(chinese(a.name)?a.name:chinese(m.name)?m.name:'',a.originalName||m.originalName||a.name,[m.name,...(m.aliases||[])],a.bgm||a.mal),originalName:a.originalName||m.originalName,mal:m.conflicts?.mal?undefined:m.mal?Number(m.mal):a.mal,kitsuId:exactStage(a)?undefined:a.kitsuId,rating:exactStage(a)?Object.fromEntries(Object.entries(a.rating).filter(([source])=>source==='bgm')):a.rating,broadcast:m.broadcast??a.broadcast,end:m.end??a.end,streams:m.streams||[],homepage:m.homepage,homepageIsArchive:m.homepageIsArchive,sourceLinks:m.sourceLinks||[],extraStreams:m.extraStreams||[],editorial:m.editorial,language:m.language,metadataDate:m.metadataDate,imdb:m.imdb,review:m.review,discussions:m.discussions,reviewCoverage:m.reviewCoverage,playback:m.playback,watchListings:m.watchListings??a.watchListings??[]}:a}
