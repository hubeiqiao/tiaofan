/** A same-URL reader slot. History holds opaque ownership only, never title/account data. */
export function createReaderHistory(env:{history:{state:unknown;pushState:(state:unknown,unused:string)=>void;replaceState:(state:unknown,unused:string)=>void;back:()=>void};close:()=>void;dismissChild:()=>boolean;token:string}){
 const field='animeReader';let open=false,owned=false,awaitingBack=false;
 const state=()=>{const value=env.history.state;return value&&typeof value==='object'?{...value as Record<string,unknown>}:{};};
 const marker=()=>{const value=state()[field];if(typeof value==='string')return {slot:value,owner:null};return value&&typeof value==='object'&&typeof (value as any).slot==='string'?value as {slot:string;owner:string|null}:null;};
 const isOwn=()=>marker()?.owner===env.token;
 const clean=()=>{const next=state();delete next[field];return next;};
 let reusableSlot=marker()?.slot??null;
 const claim=()=>{const current=marker();const next={...clean(),[field]:{slot:reusableSlot&&current?.slot===reusableSlot?reusableSlot:env.token,owner:env.token}};if(reusableSlot&&current?.slot===reusableSlot)env.history.replaceState(next,'');else env.history.pushState(next,'');reusableSlot=null;owned=true;};
 const idle=()=>{const current=marker();if(current&&isOwn()){env.history.replaceState({...clean(),[field]:{slot:current.slot,owner:null}},'');reusableSlot=current.slot;}};
 return {
  sync(next:boolean){
   if(next===open)return;open=next;
   if(next){if(awaitingBack)return;claim();}
   else if(owned){owned=false;if(isOwn()){awaitingBack=true;env.history.back();}}
  },
  pop(){
   reusableSlot=null;
   if(awaitingBack){awaitingBack=false;if(open)claim();return;}
   if(!open){idle();return;}
   if(isOwn())return;
   if(env.dismissChild()){claim();return;}
   owned=false;open=false;env.close();
  },
  // Retain an inert opaque slot for reload/StrictMode remount reuse. It cannot
  // restore any content and is reused only if that exact slot is still current.
  dispose(){idle();owned=false;open=false;awaitingBack=false;},
 };
}
