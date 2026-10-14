/** Server-log-only fixed categories. Never include URL, title, raw message or cause code. */
export function jikanTransportDiagnostic(error,url,{elapsedMs,clientAborted,timedOut}){
 let requestKind='unknown';try{const u=new URL(url);if(u.origin==='https://api.jikan.moe')requestKind=/^\/v4\/top\/anime$/.test(u.pathname)?'top':/^\/v4\/seasons\//.test(u.pathname)?'season':/^\/v4\/anime\/\d+\/full$/.test(u.pathname)?'anime':'unknown'}catch{}
 const code=typeof error?.cause?.code==='string'?error.cause.code:typeof error?.code==='string'?error.code:'';
 const cause=['ENOTFOUND','EAI_AGAIN'].includes(code)?'dns':['ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET'].includes(code)?'connection':['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID'].includes(code)?'tls':['ERR_INVALID_REDIRECT','ERR_TOO_MANY_REDIRECTS'].includes(code)?'redirect':'unknown';
 return{event:'jikan_transport_v1',requestKind,exceptionKind:['TypeError','AbortError','TimeoutError'].includes(error?.name)?error.name:'Other',cause,elapsedMs:Number.isFinite(elapsedMs)?Math.max(0,Math.min(18000,Math.round(elapsedMs))):null,clientAborted:clientAborted===true,timedOut:timedOut===true};
}
export function emitJikanTransportDiagnostic(error,url,state,sink=event=>console.warn(JSON.stringify(event))){try{sink(jikanTransportDiagnostic(error,url,state))}catch{/* Diagnostics must never change cache/failure behavior. */}}
