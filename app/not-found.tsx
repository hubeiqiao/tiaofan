import {SiteMark} from '@/components/site-mark';
import {SiteFooter} from '@/components/site-footer';
import {headers} from 'next/headers';
import {localeLanguage,localePath,siteBrand,type SiteLocale} from '@/lib/site-brand';
export default async function NotFound(){
 const header=(await headers()).get('x-tiaofan-locale'),locale:SiteLocale=header==='en'||header==='ja'?header:'zh';
 const copy=locale==='ja'?['ページが見つかりません','指定された作品やシーズンは、現在の公開カタログにありません。','アニメ一覧に戻る']:locale==='en'?['Page not found','This title or season is not available in the current public catalog.','Back to the anime catalog']:['没有找到这个页面','当前公开片单尚未收录这个作品或季度。','返回动画片单'];
 return <main lang={localeLanguage(locale)} className="public-content"><header className="public-heading"><SiteMark locale={locale}/><p>404</p><h1>{copy[0]}</h1><p>{copy[1]}</p><a className="public-primary" href={localePath('/',locale)}>{copy[2]}</a></header><SiteFooter locale={locale}/></main>;
}
