import {SiteMark} from '@/components/site-mark';
import {localePath,type SiteLocale} from '@/lib/site-brand';
export function SiteFooter({locale,formattedTimestamp,onInfo}:{locale:SiteLocale;formattedTimestamp?:string;onInfo?:()=>void}){
 const t=(zh:string,en:string,ja:string)=>locale==='ja'?ja:locale==='en'?en:zh;
 return <footer className="site-footer"><div className="site-footer-inner"><div className="site-footer-scene"><a href={localePath('/',locale)}><SiteMark locale={locale}/></a><nav className="site-footer-navigation"><a href={localePath('/',locale)}>{t('浏览示例','Browse demo','デモ一覧')}</a><a href={localePath('/ai',locale)}>{t('部署说明','Demo limitations','デモの制限')}</a>{onInfo&&<button type="button" onClick={onInfo}>{t('来源说明','Source details','出典の説明')}</button>}</nav></div><div className="site-footer-bottom"><p>{t('开源准备版：虚构资料，无真实评分或观看验证。','Source demo: fictional records, no real ratings or playback checks.','ソースデモ：架空の作品。実際の評価・再生確認は含まれません。')}</p>{formattedTimestamp&&<small>{formattedTimestamp}</small>}</div></div></footer>
}
