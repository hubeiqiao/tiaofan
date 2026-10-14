type Locale='zh'|'en'|'ja';
/** Explain a recorded retrieval failure without inferring provider playback. */
export function listingFailureReason(error:string|null|undefined,locale:Locale){
 const t=(zh:string,en:string,ja:string)=>locale==='ja'?ja:locale==='en'?en:zh;
 if(error==='batch_stopped')return t('本轮检查已停止；这条请求被取消，没有重试。','This batch stopped; this request was cancelled without retrying.','今回の確認を停止したため、このリクエストは再試行せず中止しました。');
 if(error==='login_required')return t('源站要求登录，本轮检查没有继续。','The provider required sign-in, so this batch stopped.','配信元でログインを求められたため、今回の確認を停止しました。');
 if(error==='redirect_refused'||error==='unsafe_redirect')return t('自动读取未接受源站的目录跳转。','The automatic reader did not accept the provider’s listing redirect.','自動取得で配信元の一覧への転送を確認できませんでした。');
 if(error==='timeout'||error==='network_error'||error==='network_unavailable'||error==='fetch_failed')return t('读取源站时超时或连接失败。','The provider request timed out or could not connect.','配信元への接続がタイムアウト、または接続できませんでした。');
 if(error?.includes('identity')||error?.includes('title')||error?.includes('category'))return t('页面的作品或分类信息未能与此条目一致对应。','The page’s title or category could not be matched to this entry.','ページの作品名・分類をこの作品と一致確認できませんでした。');
 if(error?.startsWith('http_'))return t('源站返回了未成功的响应。','The provider returned an unsuccessful response.','配信元から正常な応答を取得できませんでした。');
 return t('本次自动读取未取得可确认的集数目录。','This automatic attempt did not obtain a confirmable episode listing.','今回の自動取得では、話数一覧を確認できませんでした。');
}
