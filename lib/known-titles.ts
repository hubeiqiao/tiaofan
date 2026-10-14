import titles from '@/data/verified-titles.json';
import aliases from '@/data/search-aliases.json';
import {displayTitle} from './title-fallback';
import type {Anime} from './types';
export function originalTitle(id:string|number){return (titles.items as Record<string,{originalName:string}>)[String(id)]?.originalName||'';}
export function knownTitle(id:string|number,name?:string,original?:string){const t=(titles.items as Record<string,{originalName:string;nameCn?:string}>)[String(id)];return displayTitle(name||t?.nameCn,original||t?.originalName,(aliases as Record<string,string[]>)[String(id)]||[],id);}
export function withTitle(a:Anime):Anime{return{...a,name:knownTitle(a.bgm||a.mal||a.kitsuId||'',a.name,a.originalName),originalName:a.originalName||originalTitle(a.bgm||'')}};
