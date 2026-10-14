import {siteBrand,type SiteLocale} from '@/lib/site-brand';
export function SiteMark({locale}:{locale:SiteLocale}){return <b className="site-wordmark"><img src="/demo-mark.svg" alt="" width={36} height={36}/><strong>{siteBrand(locale)}</strong></b>}
