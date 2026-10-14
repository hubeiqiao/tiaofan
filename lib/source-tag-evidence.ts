import type {Anime} from './types';
// Deliberately allow known genre/style tags only. Shared praise, year, country or creator-name tags prove no creative credit.
const genres=new Set(['热血','科幻','奇幻','冒险','战斗','悬疑','推理','恋爱','校园','日常','治愈','搞笑','喜剧','运动','音乐','机战','历史','战争','剧情','青春','励志','友情','家庭','异世界','恐怖','血腥','魔法','美食','职场','群像','百合','后宫','萌系','致郁','赛博朋克']);
export function sharedSourceTags(seed:Anime,candidate:Anime){const actual=new Set(candidate.tags);return [...new Set(seed.tags)].filter(tag=>genres.has(tag)&&actual.has(tag)).slice(0,6)}
function sourceUrl(a:Anime){const [provider,id]=a.key.split(':');return provider==='bgm'?`https://bgm.tv/subject/${id}`:provider==='mal'?`https://myanimelist.net/anime/${id}`:`https://kitsu.app/anime/${id}`}
export function sharedTagEvidence(seed:Anime,candidate:Anime){const tags=sharedSourceTags(seed,candidate);return tags.length?{code:'SHARED_SOURCE_TAGS',label:'题材线索相近',seed:{id:seed.key,title:seed.name,sourceUrl:sourceUrl(seed)},tags,sourceUrl:`https://bgm.tv/subject/${candidate.bgm}`,text:'共同的来源标签仅是资料线索，不代表同一作者、系列关系或模型解释。'}:null}
export function favoriteTagEvidence(seeds:Anime[],candidate:Anime){return seeds.slice(0,60).map(seed=>sharedTagEvidence(seed,candidate)).filter((x):x is NonNullable<typeof x>=>!!x).sort((a,b)=>b.tags.length-a.tags.length||a.seed.id.localeCompare(b.seed.id)).slice(0,3)}
export function savedTagEvidence(seeds:Array<{anime:Anime;state:string;favorite:boolean}>,candidate:Anime){
 return seeds.slice(0,60).filter(s=>s.favorite||s.state==='watching').map(s=>{const evidence=sharedTagEvidence(s.anime,candidate);return evidence?{...evidence,seed:{...evidence.seed,state:s.state,favorite:s.favorite},signal:s.favorite?'explicit_favorite':'viewing_exposure'}:null}).filter((x):x is NonNullable<typeof x>=>!!x).sort((a,b)=>Number(b.seed.favorite)-Number(a.seed.favorite)||b.tags.length-a.tags.length||a.seed.id.localeCompare(b.seed.id)).slice(0,3);
}
