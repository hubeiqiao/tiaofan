import type {Anime} from './types';

export type LibraryState={epoch:number;identityEpoch:number;context:string|null;signedIn:boolean;items:Anime[];status:'loading'|'checking'|'ready'|'guest'|'error';error:string};
export type LibraryRevalidationOptions={onlyIfNeeded?:boolean;retainKnown?:boolean};
export const initialLibraryState:LibraryState={epoch:0,identityEpoch:0,context:null,signedIn:false,items:[],status:'loading',error:''};

export const LIBRARY_MEMORY_TTL_MS=60_000;
export function createLibrarySession(onState:(state:LibraryState)=>void,request:typeof fetch=fetch,options:{now?:()=>number;cacheMs?:number}={}){
 class IdentityBoundaryError extends Error {}
 let state=initialLibraryState,serial=0,identityEpoch=0;
 // Undefined means unverified, null is a verified guest, and a string is a verified account.
 // Only an already verified same-document view may remain read-only during a soft return.
 let confirmedIdentity:string|null|undefined;
 const now=options.now||Date.now,cacheMs=Math.max(0,Math.min(options.cacheMs??LIBRARY_MEMORY_TTL_MS,LIBRARY_MEMORY_TTL_MS));
 // A single account-bound in-memory snapshot. It is never serialized, and is
 // never resurrected after masking until a fresh response proves the same context.
 let verifiedCache:{context:string;items:Anime[];verifiedAt:number}|undefined;
 let uncertainWrite:{context:string;until:number}|undefined;
 let writeSerial=0;const pendingWrites=new Map<number,{epoch:number;context:string}>();
 let pending:{token:number;controller:AbortController;promise:Promise<void>}|undefined;
 const publish=(next:LibraryState)=>{state=next;onState(next)};
 const masked=():LibraryState=>({epoch:serial,identityEpoch,context:null,signedIn:false,items:[],status:'loading',error:''});
 const checking=(retainKnown=false):LibraryState=>retainKnown&&(state.status==='ready'||state.status==='checking')&&state.signedIn&&state.context!==null&&state.context===confirmedIdentity?{...state,epoch:serial,status:'checking',error:''}:masked();
 const cancelPending=()=>{const old=pending;pending=undefined;old?.controller.abort()};
 const invalidateIdentity=()=>{confirmedIdentity=undefined;verifiedCache=undefined;uncertainWrite=undefined;++identityEpoch};
 const confirmIdentity=(identity:string|null)=>{if(confirmedIdentity!==identity){++identityEpoch;verifiedCache=undefined;uncertainWrite=undefined}if(identity===null){verifiedCache=undefined;uncertainWrite=undefined;}confirmedIdentity=identity};

 function markUncertain(options:{retainKnown?:boolean}={}){
  // Repeated hidden/pagehide notifications are harmless, but an in-flight visible
  // check must be invalidated before a stale completion can replace the retained view.
  if((state.status==='loading'||(options.retainKnown&&state.status==='checking'))&&!pending)return;
  ++serial;cancelPending();publish(checking(options.retainKnown));
 }

 function refresh(allowCached=false,retainKnown=false):Promise<void>{
  const token=++serial;cancelPending();const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  publish(checking(retainKnown));
  const current=()=>token===serial;
  const guest=()=>{confirmIdentity(null);publish({epoch:token,identityEpoch,context:null,signedIn:false,items:[],status:'guest',error:''})};
  const active={token,controller,promise:Promise.resolve()};
  pending=active;
  active.promise=(async()=>{
   let signedIn=false;
   try{
    // A fresh authenticated watchlist response proves identity and rows together.
    // Only a usable in-memory snapshot needs the lighter session-only check.
    const cacheUsable=()=>{
     const age=verifiedCache?now()-verifiedCache.verifiedAt:Infinity;
     return !!(allowCached&&verifiedCache&&confirmedIdentity===verifiedCache.context&&age>=0&&age<cacheMs&&!(uncertainWrite?.context===verifiedCache.context&&now()<uncertainWrite.until)&&!Array.from(pendingWrites.values()).some(write=>write.context===verifiedCache?.context));
    };
    let expectedContext:string|undefined;
    if(cacheUsable()){
     const session=await request('/api/session',{cache:'no-store',signal:controller.signal});
     if(!current())return;
     if(session.status===401){guest();return}
     if(!session.ok)throw Error('无法确认当前浏览器的登录状态，请重试。');
     const auth=await session.json() as {signedIn:boolean;context?:string};
     if(!current())return;
     if(controller.signal.aborted)throw Error('片单读取超时，请重试。');
     if(typeof auth?.signedIn!=='boolean')throw new IdentityBoundaryError('登录状态响应无效，请重试。');
     signedIn=auth.signedIn;
     if(!signedIn){guest();return}
     if(typeof auth.context!=='string'||!/^[a-f0-9]{64}$/.test(auth.context))throw new IdentityBoundaryError('登录状态响应无效，请重试。');
     expectedContext=auth.context;
     if(confirmedIdentity!==auth.context){confirmIdentity(auth.context);publish(masked())}
     if(cacheUsable()&&verifiedCache?.context===auth.context){
      publish({epoch:token,identityEpoch,context:auth.context,signedIn:true,items:verifiedCache.items,status:'ready',error:''});
      return;
     }
    }
    const response=await request('/api/watchlist',{cache:'no-store',signal:controller.signal});
    if(!current())return;
    if(controller.signal.aborted)throw Error('片单读取超时，请重试。');
    if(response.status===401){guest();return}
    if(response.status===409)throw new IdentityBoundaryError('登录账号已变化，请重新核对片单。');
    if(!response.ok){
     // Error responses may be HTML or omit context. They prove no account change.
     const failure=await response.json().catch(()=>null) as {error?:string}|null;
     if(!current())return;
     throw Error(failure?.error||'读取云端追番列表失败，请重试。');
    }
    const body=await response.json() as {items?:Anime[];context?:string;error?:string};
    if(!current())return;
    if(controller.signal.aborted)throw Error('片单读取超时，请重试。');
    if(typeof body?.context!=='string'||!/^[a-f0-9]{64}$/.test(body.context)||(expectedContext!==undefined&&body.context!==expectedContext))throw new IdentityBoundaryError('登录账号已变化，请重新核对片单。');
    signedIn=true;
    if(confirmedIdentity!==undefined&&confirmedIdentity!==body.context){confirmIdentity(body.context);publish(masked())}
    if(!Array.isArray(body?.items))throw Error(body?.error||'读取云端追番列表失败，请重试。');
    confirmIdentity(body.context);
    verifiedCache=(uncertainWrite?.context===body.context&&now()<uncertainWrite.until)||Array.from(pendingWrites.values()).some(write=>write.context===body.context)?undefined:{context:body.context,items:body.items,verifiedAt:now()};
    publish({epoch:token,identityEpoch,context:body.context,signedIn:true,items:body.items,status:'ready',error:''});
   }catch(error){
    if(current()){
     // Transport failures/timeouts are uncertainty, not a proven identity change.
     // The current error state still exposes no context/rows and blocks all writes.
     // Malformed successful JSON or invalid/mismatched contexts retire old drafts.
     if(error instanceof IdentityBoundaryError||(error instanceof SyntaxError&&!controller.signal.aborted))invalidateIdentity();
     publish({epoch:token,identityEpoch,context:null,items:[],signedIn,status:'error',error:controller.signal.aborted?'片单读取超时，请重试。':error instanceof Error?error.message:'读取云端追番列表失败，请重试。'});
    }
   }finally{
    clearTimeout(timer);
    if(pending?.token===token)pending=undefined;
   }
  })();
  return active.promise;
 }

 function revalidate(options:LibraryRevalidationOptions={}):Promise<void>{
  if(pending)return pending.promise;
  if(options.onlyIfNeeded&&(state.status==='ready'||state.status==='guest'))return Promise.resolve();
  return refresh(true,options.retainKnown);
 }

 return {
  refresh,revalidate,markUncertain,
  beginMutation(epoch:number){
   if(epoch!==serial||state.epoch!==epoch||state.status!=='ready'||!state.signedIn||!state.context||Array.from(pendingWrites.values()).some(write=>write.context===state.context&&write.epoch!==serial))return null;
   verifiedCache=undefined;const token=++writeSerial;pendingWrites.set(token,{epoch,context:state.context});return token;
  },
  finishMutation(token:number,visible=false,uncertain=false){
   const write=pendingWrites.get(token);if(!write)return;
   pendingWrites.delete(token);
   // A timed-out request can still commit server-side after a pre-edit GET.
   // Do not turn that uncertain read into a warm cache for the next return.
   if(uncertain&&write.context===confirmedIdentity)uncertainWrite={context:write.context,until:now()+LIBRARY_MEMORY_TTL_MS};
   if(verifiedCache?.context===write.context)verifiedCache=undefined;
   // A GET begun before an old POST settled may have observed its pre-edit state.
   // Recheck only the still-current account, after its writes have settled.
   if(visible&&write.context===confirmedIdentity&&write.epoch!==serial&&!Array.from(pendingWrites.values()).some(other=>other.context===write.context))void refresh();
  },
  isCurrent(epoch:number){return epoch===serial&&state.epoch===epoch&&state.status==='ready'&&state.signedIn},
  isIdentityCurrent(identity:number){return identity===identityEpoch&&state.status==='ready'&&state.signedIn},
  update(value:Anime[]|((old:Anime[])=>Anime[]),epoch:number){
   if(epoch!==serial||state.epoch!==epoch||state.status!=='ready'||!state.signedIn)return false;
   const items=typeof value==='function'?value(state.items):value;
   if(verifiedCache?.context===state.context)verifiedCache={...verifiedCache,items};
   publish({...state,items});return true;
  },
  dispose(){
   ++serial;cancelPending();verifiedCache=undefined;uncertainWrite=undefined;pendingWrites.clear();
   // No setState during unmount. Mask internally too, so retained callbacks cannot
   // act on the last ready state. A Strict Mode effect replay can revalidate anew.
   state=masked();
  },
 };
}
