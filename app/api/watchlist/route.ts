import {isWatchlistState} from '@/lib/types';
import {accountContext} from '@/lib/account-context';
import {withTitle} from '@/lib/known-titles';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
const publicSaved=(a:any)=>({...withTitle(a),rating:Object.fromEntries(Object.entries(a.rating||{}).filter(([k])=>k!=='imdb'))});
const out=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{const user=await getChatGPTUser();if(!user)return out({error:'Private libraries are disabled in this source demo.'},401);if(!env.DB)return out({error:'云端列表暂时不可用。'},503);const r=await env.DB.prepare('SELECT payload, state, updated_at, favorite FROM watchlist WHERE user_id = ? AND removed = 0 ORDER BY updated_at DESC').bind(user.userId).all<{payload:string,state:string,favorite:number}>();return out({context:await accountContext(user.userId),items:r.results.map(r=>({...publicSaved(JSON.parse(r.payload)),state:r.state,favorite:r.favorite===1}))});}catch{return out({error:'读取云端追番列表失败，请重试。'},503)}}
export async function POST(req:Request){try{const user=await getChatGPTUser();if(!user)return out({error:'Saving is disabled in this source demo.'},401);const context=await accountContext(user.userId);const origin=req.headers.get('origin');if((origin&&origin!==new URL(req.url).origin)||req.headers.get('sec-fetch-site')==='cross-site')return out({error:'请求来源不匹配。'},403);if(!req.headers.get('content-type')?.includes('application/json'))return out({error:'请求格式不正确。'},415);if(!env.DB)return out({error:'云端列表暂时不可用。'},503);const raw=await req.text();if(raw.length>96000)return out({error:'条目信息过长。'},400);const body=JSON.parse(raw);if(!body||typeof body.expectedContext!=='string'||body.expectedContext!==context)return out({code:'ACCOUNT_CONTEXT_CHANGED',error:'登录状态已变化或页面版本已更新，请刷新片单后重试。'},409);const x=body.anime;const key=body.key||x?.key;const state=body.state===undefined?'saved':body.state;if(typeof key!=='string'||!/^(?:bgm|mal|kitsu):\d+$/.test(key)||!(state==='removed'||isWatchlistState(state)))return out({error:'条目或状态不正确。'},400);
 if(body.action==='favorite'){
  if(typeof body.favorite!=='boolean')return out({error:'收藏标记无效。'},400);
  const prior=await env.DB.prepare('SELECT payload,state,favorite FROM watchlist WHERE user_id=? AND anime_key=? AND removed=0').bind(user.userId,key).first<{payload:string,state:string,favorite:number}>();
  if(!prior&&(!x||typeof x.name!=='string'||x.name.length>250))return out({error:'缺少作品资料。'},400);
  const value=body.favorite?1:0;
  if(prior){const row=await env.DB.prepare('UPDATE watchlist SET favorite=?,updated_at=MAX(updated_at+1,?) WHERE user_id=? AND anime_key=? AND removed=0 RETURNING payload,state,favorite').bind(value,Date.now(),user.userId,key).first<{payload:string,state:string,favorite:number}>();if(!row)return out({error:'条目状态已变化，请刷新后重试。'},409);return out({context,ok:true,item:{...publicSaved(JSON.parse(row.payload)),state:row.state,favorite:row.favorite===1}})}
  if(!body.favorite)return out({context,ok:true,item:null});
  const row=await env.DB.prepare("INSERT INTO watchlist(user_id,anime_key,payload,state,updated_at,removed,favorite) VALUES(?,?,?,'saved',?,0,1) ON CONFLICT(user_id,anime_key) DO UPDATE SET payload=CASE WHEN watchlist.removed=1 THEN excluded.payload ELSE watchlist.payload END,state=CASE WHEN watchlist.removed=1 THEN 'saved' ELSE watchlist.state END,removed=0,favorite=1,updated_at=MAX(watchlist.updated_at+1,excluded.updated_at) RETURNING payload,state,favorite").bind(user.userId,key,JSON.stringify(x),Date.now()).first<{payload:string,state:string,favorite:number}>();
  if(!row)return out({error:'收藏未能保存，请重试。'},503);return out({context,ok:true,item:{...publicSaved(JSON.parse(row.payload)),state:row.state,favorite:row.favorite===1}});
 }
 if(body.action==='swipe-undo'){
  if(!Number.isSafeInteger(body.revision)||body.revision<1)return out({error:'撤销记录无效。'},400);
  const expectedState=body.expectedState;
  if(expectedState!==undefined&&expectedState!=='saved'&&expectedState!=='want')return out({error:'撤销记录无效。'},400);
  // Explicit receipts match their original state. Legacy clients omit it; revision still
  // prevents undo after any later state/favorite edit, including change-and-change-back.
  const reverted=await env.DB.prepare("UPDATE watchlist SET removed=1,updated_at=MAX(updated_at+1,?) WHERE user_id=? AND anime_key=? AND removed=0 AND state IN ('saved','want') AND (? IS NULL OR state=?) AND updated_at=? RETURNING anime_key").bind(Date.now(),user.userId,key,expectedState??null,expectedState??null,body.revision).first();
  return out({context,ok:true,reverted:!!reverted});
 }
 if(body.action&&body.action!=='swipe-save')return out({error:'不支持的操作。'},400);
 if(state==='removed'&&!body.action){await env.DB.prepare('UPDATE watchlist SET removed=1, updated_at=MAX(updated_at+1,?) WHERE user_id=? AND anime_key=?').bind(Date.now(),user.userId,key).run();return out({context,ok:true});}
 if(!x||typeof x.name!=='string'||x.name.length>250)return out({error:'缺少条目信息。'},400);
 // A plain Add is idempotent. Only an explicit state edit may change an active
 // entry's chosen status. Every new insert supplies state, ignoring the legacy DB default.
 if(body.action==='swipe-save'||(!body.action&&body.state===undefined)){
  const revision=Date.now();
  const inserted=await env.DB.prepare("INSERT INTO watchlist (user_id,anime_key,payload,state,updated_at,removed) VALUES (?,?,?,'saved',?,0) ON CONFLICT(user_id,anime_key) DO UPDATE SET payload=excluded.payload,state='saved',updated_at=MAX(watchlist.updated_at+1,excluded.updated_at),removed=0,favorite=0 WHERE watchlist.removed=1 RETURNING payload,state,updated_at,favorite").bind(user.userId,key,JSON.stringify(x),revision).first<{payload:string,state:string,updated_at:number,favorite:number}>();
  const row=inserted||await env.DB.prepare('SELECT payload,state,updated_at,favorite FROM watchlist WHERE user_id=? AND anime_key=? AND removed=0').bind(user.userId,key).first<{payload:string,state:string,updated_at:number,favorite:number}>();
  if(!row)return out({error:'保存状态已变化，请重试。'},409);
  return out({context,ok:true,changed:!!inserted,revision:inserted?row.updated_at:undefined,item:{...publicSaved(JSON.parse(row.payload)),state:row.state,favorite:row.favorite===1}});
 }
 const payload=JSON.stringify(x);await env.DB.prepare('INSERT INTO watchlist (user_id,anime_key,payload,state,updated_at,removed) VALUES (?,?,?,?,?,0) ON CONFLICT(user_id,anime_key) DO UPDATE SET payload=excluded.payload,state=excluded.state,updated_at=MAX(watchlist.updated_at+1,excluded.updated_at),favorite=CASE WHEN watchlist.removed=1 THEN 0 ELSE watchlist.favorite END,removed=0').bind(user.userId,key,payload,state,Date.now()).run();return out({context,ok:true});
 }catch{return out({error:'保存没有成功，请重试；页面不会假装已保存。'},503)}}
