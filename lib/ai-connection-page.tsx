import {SiteMark} from '@/components/site-mark';
import {SiteFooter} from '@/components/site-footer';
import {localePath,homeMetadata,type SiteLocale} from './site-brand';
export const aiMetadata=(locale:SiteLocale)=>homeMetadata(locale);
export function AiConnectionPage({locale}:{locale:SiteLocale}){
 const t=(zh:string,en:string,ja:string)=>locale==='zh'?zh:locale==='ja'?ja:en;
 return <main className="public-content ai-connection"><a href={localePath('/',locale)}><SiteMark locale={locale}/></a><h1>{t('源码演示的限制','Source demo limitations','ソースデモの制限')}</h1><p>{t('此版本只包含明确标记的虚构示例。登录、私人片单、外部 AI 推荐与实时数据更新均未启用。','This build contains explicitly fictional sample data. Sign-in, private libraries, external AI recommendations and live data updates are disabled.','このビルドには架空のサンプルだけが含まれます。ログイン、非公開リスト、外部AI推薦、ライブ更新は無効です。')}</p><p>{t('原托管平台的身份认证和连接器无法直接移植。运营者需自行实现并审核服务端身份验证、权限隔离、数据存储和连接器。','The original hosting platform’s identity and connector services are not portable. An operator must implement and review server-side authentication, per-user authorization, storage and provider integrations.','元のホスティング環境の認証・コネクターは移植されていません。運用にはサーバー側の認証、ユーザー別の権限制御、保存先、外部連携の実装と審査が必要です。')}</p><p>{t('匿名 MCP 仅可读取示例。私人片单始终拒绝访问，传入身份请求头不会启用登录。','Anonymous MCP can read demo records only. Private-library access always fails closed; identity headers do not enable sign-in.','匿名MCPはデモ資料だけを参照できます。非公開リストは常に拒否され、識別情報のリクエストヘッダーでログインできません。')}</p><SiteFooter locale={locale}/></main>
}
