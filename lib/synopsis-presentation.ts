import type {Locale} from '@/lib/localization';

/** Presentation-only: known missing-data messages are not story excerpts. */
export function genuineSynopsis(value?:string|null):string {
 const text=(value||'').replace(/<[^>]+>/g,'').trim();
 if(!text)return '';
 const absent=[/^An English synopsis is not yet available\./i,/^Loading English synopsis(?:…|\.\.\.)?$/i,/^日本語のあらすじ(?:はまだありません。|を読み込み中(?:…|\.\.\.)?$)/,/^This catalogue snapshot does not include a synopsis\./i,/^No synopsis (?:is available|has been)/i,/^このカタログの(?:保存データ|取得時点の情報|収録情報)には、(?:具体的な)?あらすじ(?:は|が)(?:含まれていな|含まれていません|掲載されていな)/,/^(?:出典にはまだあらすじ|あらすじは未掲載)/,/^(?:剧情简介尚未收录|暂无剧情简介|来源尚未(?:提供(?:具体剧情)?|收录)简介|来源尚未提供具体剧情简介)/];
 return absent.some(pattern=>pattern.test(text))?'':text;
}
export function readingSynopsis(value:string|null|undefined,locale:Locale):string {
 return genuineSynopsis(value)||(locale==='ja'?'あらすじは未掲載です。':locale==='en'?'Synopsis not available yet.':'暂无剧情简介。');
}
