import type {SiteLocale} from './site-brand';
export const LANGUAGE_COOKIE='tiaofan-language';
export function validLanguage(value:unknown):value is SiteLocale{return value==='zh'||value==='en'||value==='ja'}
export function languageCookie(cookie:string|null){for(const part of (cookie||'').split(';')){const [key,...values]=part.trim().split('=');if(key===LANGUAGE_COOKIE){const value=values.join('=');return validLanguage(value)?value:null}}return null}
export function preferredLanguage(acceptLanguage:string|null):SiteLocale{
 const ranked=(acceptLanguage||'').split(',').map((part,index)=>{const [tag,...parameters]=part.trim().toLowerCase().split(';');const quality=parameters.find(p=>p.trim().startsWith('q='));const raw=quality?.trim().slice(2);const q=raw===undefined?1:/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw)?Number(raw):0;const language=tag.split('-')[0];return{language,q,index}}).filter(v=>validLanguage(v.language)&&v.q>0&&v.q<=1).sort((a,b)=>b.q-a.q||a.index-b.index);
 return (ranked[0]?.language||'en') as SiteLocale;
}
export function languageEntryTarget(locale:SiteLocale,search='',hash=''){return '/'+locale+search+hash}
/** Cookie preference wins; legacy localStorage is read only when the cookie is absent. */
export function chooseEntryLanguage(cookie:string|null,legacy:string|null,acceptLanguage:string|null,navigatorLanguages:readonly string[]=[]):SiteLocale{
 return languageCookie(cookie)||(validLanguage(legacy)?legacy:null)||preferredLanguage(acceptLanguage||navigatorLanguages.join(','));
}
export function languageCookieValue(locale:SiteLocale,secure=true){return `${LANGUAGE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure?'; Secure':''}`}
export function rememberLanguage(locale:SiteLocale){try{document.cookie=languageCookieValue(locale,location.protocol==='https:')}catch{}try{localStorage.setItem('anime-locale',locale)}catch{}}
/** A tiny neutral entry script preserves pre-cookie manual choices and URL fragments. */
export function entryLanguageScript(acceptLanguage:string|null){
 return `(function(){var supported=function(v){return v==='zh'||v==='en'||v==='ja'},cookie=null;document.cookie.split(';').some(function(p){var a=p.trim().split('='),name=a.shift(),value=a.join('=');if(name==='${LANGUAGE_COOKIE}'){cookie=supported(value)?value:null;return true}return false});var legacy=null;try{var saved=localStorage.getItem('anime-locale');if(supported(saved))legacy=saved}catch(e){}var header=${JSON.stringify(acceptLanguage).replace(/</g,'\\u003c')};var language=cookie||legacy;if(!language){var list=header||(navigator.languages||[navigator.language]).join(',');var rows=list.split(',').map(function(p,i){var parts=p.trim().toLowerCase().split(';'),tag=parts.shift().split('-')[0],raw=parts.find(function(x){return x.trim().indexOf('q=')===0}),q=raw===undefined?1:/^(?:0(?:\\.\\d{0,3})?|1(?:\\.0{0,3})?)$/.test(raw.trim().slice(2))?Number(raw.trim().slice(2)):0;return{tag:tag,q:q,i:i}}).filter(function(v){return supported(v.tag)&&v.q>0&&v.q<=1}).sort(function(a,b){return b.q-a.q||a.i-b.i});language=rows.length?rows[0].tag:'en'}if(!cookie&&legacy)document.cookie='${LANGUAGE_COOKIE}='+legacy+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');location.replace('/'+language+location.search+location.hash)})();`;
}
