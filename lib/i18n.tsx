'use client';
import {I18nProvider} from '@heroui/react/rac';
import {EditorialSelect} from '@/components/editorial-select';
import {rememberLanguage} from './language-preference';
import {localePath} from './site-brand';
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import type {Anime} from './types';
import {premiereLabel as chinesePremiere} from './premiere';
import {formatName as chineseFormat,scoreComment as chineseScoreComment,dateStatus,mediaGroup} from './catalog';

// Typed, reviewed interface messages. Machine values and source content are never rewritten.
import {translate,translateKnownText,type Locale,type TranslationKey,type Translator} from './localization';
import {japaneseFormat,japanesePremiere,japaneseScoreComment} from './japanese-format';
export {translate,translateKnownText,type Locale,type TranslationKey,type Translator} from './localization';
type LocaleContextValue={locale:Locale;setLocale:(locale:Locale)=>void;t:Translator;intlLocale:string;translateKnown:(text:string)=>string};
const LocaleContext=createContext<LocaleContextValue|null>(null);
export function LocaleProvider({children,initialLocale='zh'}:{children:ReactNode;initialLocale?:Locale}){
 const [locale,setValue]=useState<Locale>(initialLocale);
 // The URL is authoritative for SSR and hydration. Stored preferences never override a deep link.
 useEffect(()=>{setValue(initialLocale)},[initialLocale]);
 useEffect(()=>{document.documentElement.lang=locale==='ja'?'ja':locale==='en'?'en':'zh-Hans'},[locale]);
 const value=useMemo<LocaleContextValue>(()=>({locale,setLocale:(next)=>{rememberLanguage(next);window.location.assign(localePath(window.location.pathname,next)+window.location.search+window.location.hash)},t:(key)=>translate(locale,key),intlLocale:locale==='ja'?'ja-JP':locale==='en'?'en-US':'zh-CN',translateKnown:(text)=>translateKnownText(locale,text)}),[locale]);
 return <LocaleContext.Provider value={value}><I18nProvider locale={locale==='zh'?'zh-CN':locale}>{children}</I18nProvider></LocaleContext.Provider>;
}
export function useLocale(){const value=useContext(LocaleContext);if(!value)throw new Error('useLocale requires LocaleProvider');return value}
export function LanguageToggle(){const {locale,setLocale,t}=useLocale();return <EditorialSelect className="language-control" label={t('界面语言')} value={locale} onChange={value=>setLocale(value as Locale)} options={[{value:'zh',label:'中文',lang:'zh-Hans'},{value:'en',label:'English',lang:'en'},{value:'ja',label:'日本語',lang:'ja'}]}/>}

export function localizedFormat(value:string,locale:Locale){if(locale==='zh')return chineseFormat(value);if(locale==='ja')return japaneseFormat(value);return ({'其他':'Other',tv:'TV anime','电视动画':'TV anime',web:'Web anime',ona:'Web anime','网络动画':'Web anime',ova:'OVA',oad:'OAD',movie:'Movie','剧场版':'Movie','电影':'Movie',special:'Special','特别篇':'Special',music:'Music video','原创影像':'OVA','附赠动画':'OAD'} as Record<string,string>)[value.toLowerCase()]||value||'Format unconfirmed'}
export function localizedPremiere(value:string,locale:Locale,today=new Date().toISOString().slice(0,10),format='TV'){
 if(locale==='zh')return chinesePremiere(value,today,format);if(locale==='ja')return japanesePremiere(value,today,format);
 const date=(value||'').trim(),movie=['movie','剧场版','电影'].includes(format.toLowerCase());
 if(/^\d{4}-\d{2}-\d{2}$/.test(date)){const d=new Date(date+'T00:00:00Z');if(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===date)return (movie?'Source release: ':date>today?'Expected premiere: ':'Premiered: ')+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:date.slice(0,4)===today.slice(0,4)?undefined:'numeric',timeZone:'UTC'}).format(d)}
 if(/^\d{4}-\d{2}$/.test(date)&&Number(date.slice(5))>=1&&Number(date.slice(5))<=12){const label=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'-01T00:00:00Z'));return (date<today.slice(0,7)?(movie?'Source release month: ':'Source premiere month: '):'Expected: ')+label+(date<today.slice(0,7)?'':' · Day unconfirmed')}
 const quarter=date.match(/^(\d{4})-Q([1-4])$/i);if(quarter)return 'Expected: '+['Winter','Spring','Summer','Autumn'][Number(quarter[2])-1]+' '+quarter[1];
 return movie?'Release date unverified':'Premiere date unconfirmed';
}
export function broadcastWeekday(broadcast:string|undefined,timeZone:string){const match=broadcast?.match(/^R(?:\d*)?\/(.+)\/P7D$/);if(!match)return '';const date=new Date(match[1]);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('zh-CN',{weekday:'long',timeZone}).format(date)}
export function localizedScoreComment(a:Anime,locale:Locale){
 if(locale==='zh')return chineseScoreComment(a);if(locale==='ja')return japaneseScoreComment(a);
 const rating=a.rating.bgm,parts:string[]=[];
 if(dateStatus(a)==='upcoming')parts.push(mediaGroup(a)==='movie'?'The source release date is still ahead. Festival or other-region screenings may already have occurred; scores reflect existing source reviews.':'The premiere date is still ahead. Existing scores are early references, not a complete post-release assessment.');
 if(rating?.count){const n=rating.count.toLocaleString('en-US');parts.push(rating.count<50?`Only ${n} Bangumi ratings: this small sample is sensitive to a few opinions.`:rating.count<500?`${n} Bangumi ratings suggest early tendencies, but may change substantially as episodes air.`:`${n} Bangumi ratings are available. Check their distribution to see how closely opinions agree.`)}else parts.push(Object.values(a.rating).some(r=>r.score!=null)?'No Bangumi rating has been collected. Refer to each other source’s score and vote count separately; different communities are not interchangeable.':'No rating is available from the connected sources yet. No rating is not a zero score and does not indicate poor quality.');
 if(rating?.distribution){const entries=Object.entries(rating.distribution),total=entries.reduce((n,[,count])=>n+count,0);if(total){const high=entries.filter(([score])=>Number(score)>=8).reduce((n,[,count])=>n+count,0),low=entries.filter(([score])=>Number(score)<=4).reduce((n,[,count])=>n+count,0);parts.push(`Scores of 8–10 make up ${Math.round(high/total*100)}% of these votes; scores of 1–4 make up ${Math.round(low/total*100)}%. This is a community vote distribution, not this site’s verdict.`)}}return parts;
}
