export type ScrollRestorationDriver={
 requestFrame:(callback:()=>void)=>number;
 cancelFrame:(id:number)=>void;
 /** Return false if the content cannot yet reach the target; a later effect retries. */
 scrollTo:(top:number)=>boolean|void;
};

/** Retain a restore target until a frame actually applies it, without browser globals. */
export function createScrollRestorationCoordinator(driver:ScrollRestorationDriver){
 let target:number|null=null,generation=0;
 let frame:{id:number;generation:number}|undefined;
 function cancelFrame(){if(frame){driver.cancelFrame(frame.id);frame=undefined}}
 function setTarget(top:number|null){
  cancelFrame();++generation;
  target=top!==null&&Number.isFinite(top)&&top>=0?top:null;
 }
 function restoreWhen(ready:boolean){
  cancelFrame();
  if(!ready||target===null)return()=>{};
  const top=target,token=++generation;
  const id=driver.requestFrame(()=>{
   if(frame?.generation!==token||generation!==token||target!==top)return;
   frame=undefined;
   // Consume only after the frame runs. Cleanup or a failed/clamped scroll keeps it.
   if(driver.scrollTo(top)!==false&&generation===token&&target===top)target=null;
  });
  frame={id,generation:token};
  return()=>{if(frame?.generation===token)cancelFrame()};
 }
 return {
  setTarget,restoreWhen,
  cancel(){setTarget(null)},
  pendingTarget(){return target},
  isPending(){return target!==null},
  persistedScroll(current:number){return target??Math.max(0,current)},
 };
}
