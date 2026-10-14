import type {Metadata} from 'next';

export type SiteLocale='zh'|'en'|'ja';
export const SITE_LOCALES:readonly SiteLocale[]=['zh','en','ja'];
export const SITE_ORIGIN='https://example.invalid';

const COPY={
 zh:{name:'挑番 · 示例',title:'挑番｜新番推荐、评分对比与观看指南',description:'发现下一部好动画，收藏喜欢的，找到哪里看。',ogAlt:'挑番，新番推荐、评分对比与观看指南'},
 en:{name:'Tiaofan Demo',title:'Tiaofan | Anime recommendations, ratings & where to watch',description:'Find your next anime, save your favorites, and see where to watch.',ogAlt:'Tiaofan, your seasonal anime discovery and watch guide'},
 ja:{name:'ティアオファン・デモ',title:'ティアオファン｜新作アニメ・評価比較・視聴ガイド',description:'次に観たいアニメを見つけて、お気に入りを保存。どこで観られるかもチェック。',ogAlt:'ティアオファン、新作アニメの評価比較と視聴ガイド'}
} as const;
export const siteCopy=(locale:SiteLocale)=>COPY[locale];
export const siteBrand=(locale:SiteLocale)=>COPY[locale].name;
export const localeLanguage=(locale:SiteLocale)=>locale==='zh'?'zh-Hans':locale;
export const localeOpenGraph=(locale:SiteLocale)=>({zh:'zh_CN',en:'en_US',ja:'ja_JP'} as const)[locale];
export const localeOgAlternates=(locale:SiteLocale)=>SITE_LOCALES.filter(l=>l!==locale).map(localeOpenGraph);
export const SITE_NAME=COPY.zh.name;
export const SITE_TITLE=COPY.zh.title;
export const SITE_DESCRIPTION=COPY.zh.description;

// Canonical identity is route-based. Switching language never changes the domain.
export function localePath(path:string,locale:SiteLocale){
 const normalized=('/'+path.replace(/^\/+/, '')).replace(/^\/(?:zh|en|ja)(?=\/|$)/,'')||'/';
 return locale==='zh'?(normalized==='/'?'/zh':normalized):(locale==='en'?'/en':'/ja')+(normalized==='/'?'':normalized);
}
export function routeLocale(path:string):SiteLocale{return /^\/ja(?:\/|$)/.test(path)?'ja':/^\/en(?:\/|$)/.test(path)?'en':'zh'}
export function localeAlternates(path:string){
 const clean=path.split(/[?#]/,1)[0]||'/',locale=routeLocale(clean);
 return{canonical:SITE_ORIGIN+localePath(clean,locale),languages:{'zh-Hans':SITE_ORIGIN+localePath(clean,'zh'),en:SITE_ORIGIN+localePath(clean,'en'),ja:SITE_ORIGIN+localePath(clean,'ja'),'x-default':SITE_ORIGIN+(localePath(clean,'zh')==='/zh'?'/':localePath(clean,'zh'))}};
}
// Only neutral, locally authored SVG artwork ships with this source snapshot.
export function siteOgImage(locale:SiteLocale){return{url:SITE_ORIGIN+'/demo-social.svg',width:1200,height:630,type:'image/svg+xml',alt:COPY[locale].ogAlt}}
export function homeMetadata(locale:SiteLocale,_includeVideo=false):Metadata{
 const {name,title}=COPY[locale],description='Synthetic source demo. No real anime, ratings, account access or playback verification.',path=localePath('/',locale),image=siteOgImage(locale);
 return{title:title+' · Demo',description,alternates:localeAlternates(path),robots:{index:false,follow:false},openGraph:{title,description,url:SITE_ORIGIN+path,siteName:name,type:'website',locale:localeOpenGraph(locale),alternateLocale:localeOgAlternates(locale),images:[image]},twitter:{card:'summary_large_image',title,description,images:[image.url]}};
}
