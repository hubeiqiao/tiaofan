import {headers} from 'next/headers';
import {entryLanguageScript} from '@/lib/language-preference';
import {SITE_ORIGIN,siteOgImage,siteCopy} from '@/lib/site-brand';
export const dynamic='force-dynamic';
const entryTitle='Tiaofan · 挑番 · ティアオファン';
const {title,description}=siteCopy('en');
export const metadata={title,description,alternates:{canonical:SITE_ORIGIN+'/',languages:{'zh-Hans':SITE_ORIGIN+'/zh',en:SITE_ORIGIN+'/en',ja:SITE_ORIGIN+'/ja','x-default':SITE_ORIGIN+'/'}},openGraph:{locale:'en_US',url:SITE_ORIGIN+'/',title,description,images:[siteOgImage('en')]},twitter:{card:'summary_large_image',title,description,images:[siteOgImage('en').url]}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const accept=(await headers()).get('accept-language'),params=new URLSearchParams();for(const [key,value]of Object.entries(await searchParams||{})){for(const item of Array.isArray(value)?value:value===undefined?[]:[value])params.append(key,item)}const query=params.size?'?'+params.toString():'';return <><script dangerouslySetInnerHTML={{__html:entryLanguageScript(accept)}}/><main className="language-entry"><p>{entryTitle}</p><nav aria-label="Language"><a href={'/zh'+query} lang="zh-Hans">中文</a> <a href={'/en'+query} lang="en">English</a> <a href={'/ja'+query} lang="ja">日本語</a></nav></main></>}
