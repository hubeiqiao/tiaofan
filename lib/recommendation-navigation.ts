/** A public destination marker only. Never put library or recommendation data in history. */
export const RECOMMENDATION_HASH='#recommendations';
type HistoryState=Record<string,unknown>;
export function createRecommendationNavigation(env:{
 history:{state:unknown;pushState:(state:unknown,title:string,url:string)=>void;replaceState:(state:unknown,title:string,url:string)=>void;back:()=>void};
 location:()=>{pathname:string;search:string;hash:string};token:string;
 enter:(capture:boolean)=>void;leave:(restore:boolean)=>void;dismissChild:()=>boolean;
}){
 const field='animeRecommendations';let active=false,awaitingBack=false,reopen=false,returnThroughReader=false;
 const state=():HistoryState=>env.history.state&&typeof env.history.state==='object'?{...env.history.state as HistoryState}:{};
 const clean=()=>{const next=state();delete next[field];delete next.animeReader;return next;};
 const url=(hash:string)=>{const l=env.location();return l.pathname+l.search+hash;};
 const isDestination=()=>env.location().hash===RECOMMENDATION_HASH;
 function push(capture:boolean){
  // A new destination is a new history slot. Do not clone an inert reader slot
  // reached by Forward: its owner could otherwise replace this destination on
  // the next detail open, making one Back skip the recommendation results.
  const next=clean();
  env.history.pushState({...next,[field]:env.token},'',url(RECOMMENDATION_HASH));active=true;env.enter(capture);
 }
 return {
  start(){if(isDestination()){active=true;env.enter(true);}},
  isOpen:()=>active,
  show(){if(active)return;active=true;if(awaitingBack){reopen=true;env.enter(false);return;}push(true);},
  leave(restore=true){if(!active)return;active=false;reopen=false;env.leave(restore);if(isDestination()&&state()[field]===env.token){const reader=state().animeReader;returnThroughReader=!!reader&&typeof reader==='object'&&(reader as {owner?:unknown}).owner===null;awaitingBack=true;env.history.back();}else if(isDestination())env.history.replaceState(clean(),'',url(''));},
  pop(){
   if(awaitingBack){
    if(returnThroughReader){returnThroughReader=false;if(isDestination()&&state()[field]===env.token){env.history.back();return;}}
    awaitingBack=false;if(reopen){reopen=false;push(false);}return;
   }
   const next=isDestination();if(next===active)return;
   if(!next&&active&&env.dismissChild()){push(false);return;}
   active=next;if(next)env.enter(false);else env.leave(true);
  },
  dispose(){active=false;reopen=false;returnThroughReader=false;},
 };
}
