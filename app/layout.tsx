import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {SITE_ORIGIN,homeMetadata,localeOgAlternates,localeLanguage,siteBrand,type SiteLocale} from '@/lib/site-brand';
import './globals.css';
import './recommendations.css';
import './themes.css';
import './materials.css';
import './controls.css';
import './feedback.css';
import './catalog-support.css';
import './gallery-shell.css';
import './public-editorial.css';
import './gallery-surfaces.css';
import './catalog-workspace.css';
import './watch-resources.css';
import './episode-updates.css';
import './rating-evidence.css';
import './brand.css';
import {ThemeProvider} from '@/components/theme-controls';

export const metadata:Metadata={metadataBase:new URL(SITE_ORIGIN),...homeMetadata('zh'),icons:{icon:'/favicon.svg'}};

// Public document language links retain the active route's query and fragment.
// The links already work without JavaScript; this only preserves client URL state.
const languageLinksScript=`(function(){function update(){document.querySelectorAll('a[data-locale-switch]').forEach(function(a){var u=new URL(a.href,location.origin);if(u.origin!==location.origin)return;u.search=location.search;u.hash=location.hash;a.href=u.href})}update();document.addEventListener('DOMContentLoaded',update);window.addEventListener('hashchange',update);window.addEventListener('popstate',update);document.addEventListener('click',function(e){if(e.target instanceof Element){var a=e.target.closest('a[data-locale-switch]');if(a){update();var l=a.getAttribute('data-locale-switch');if(l==='zh'||l==='en'||l==='ja'){try{localStorage.setItem('anime-locale',l)}catch(x){}document.cookie='tiaofan-language='+l+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')}}}},true)})();`;

export default async function Layout({children}:{children:React.ReactNode}){
 const header=(await headers()).get('x-tiaofan-locale'),locale:SiteLocale=header==='zh'||header==='ja'?header:header==='en'?header:'en',language=localeLanguage(locale);
 const schema={'@context':'https://schema.org','@type':'WebSite','@id':SITE_ORIGIN+'/#website',name:siteBrand('zh'),alternateName:[siteBrand('en'),siteBrand('ja')],url:SITE_ORIGIN+'/',inLanguage:['zh-Hans','en','ja']};
 return <html lang={language} suppressHydrationWarning><head>{localeOgAlternates(locale).map(alternate=><meta key={alternate} property="og:locale:alternate" content={alternate}/>)}<script dangerouslySetInnerHTML={{__html:`document.documentElement.lang=location.pathname==='/'?'en':/^\\/ja(?:\\/|$)/.test(location.pathname)?'ja':/^\\/en(?:\\/|$)/.test(location.pathname)?'en':'zh-Hans';try{var t=localStorage.getItem("tiaofan-theme");document.documentElement.dataset.theme=t==="dark"||t==="light"?t:t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch{}`}}/></head><body><div className="demo-banner" role="note">Synthetic demo / 虚构示例 / 架空デモ · No live ratings, sign-in or private library</div><ThemeProvider>{children}</ThemeProvider><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/><script dangerouslySetInnerHTML={{__html:languageLinksScript}}/></body></html>;
}
