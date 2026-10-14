import {publicRows,SEASONS} from '@/lib/public-content';
import {currentPeriods} from '@/lib/snapshots';
import {SITE_ORIGIN,SITE_LOCALES,localeLanguage,localePath} from '@/lib/site-brand';
const xml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export async function GET(){
 const {items,updatedAt}=await publicRows(),periods=currentPeriods();
 const paths=[...new Set(['/','/ai',...Object.values(periods).map(s=>`/season/${s.year}/${SEASONS[s.quarter]}`),...items.map(a=>'/anime/'+a.bgm)])];
 const date=new Date(updatedAt),lastmod=updatedAt&&Number.isFinite(date.getTime())?`<lastmod>${date.toISOString()}</lastmod>`:'';
 const urls=paths.flatMap(path=>SITE_LOCALES.map(locale=>{
  const alternate=SITE_LOCALES.map(l=>`<xhtml:link rel="alternate" hreflang="${localeLanguage(l)}" href="${xml(SITE_ORIGIN+localePath(path,l))}"/>`).join('')+`<xhtml:link rel="alternate" hreflang="x-default" href="${xml(SITE_ORIGIN+(path==='/'?'/':localePath(path,'zh')))}"/>`;
  return `<url><loc>${xml(SITE_ORIGIN+localePath(path,locale))}</loc>${path==='/ai'?'':lastmod}${alternate}</url>`;
 })).join('');
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+urls+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=3600'}});
}
