/** Optional title-strip gesture. Native screen-edge gestures belong to the browser. */
export function createReaderSwipe(close:()=>void){
 let start:{x:number;y:number;at:number;lastX:number}|null=null;
 const cancel=()=>{start=null};
 return {
  cancel,
  begin(x:number,y:number,at:number,width:number,touches:number,eligible:boolean){
   cancel();
   if(eligible&&touches===1&&width<=700&&x>=24&&x<=width-24)start={x,y,at,lastX:x};
  },
  move(x:number,y:number,touches:number){
   if(!start)return;
   const dx=x-start.x,dy=Math.abs(y-start.y);
   if(touches!==1||dx < -12||x<start.lastX-12||dy>32||(dy>20&&dy>Math.abs(dx)))cancel();
   else start.lastX=x;
  },
  end(x:number,y:number,at:number,touches:number){
   const origin=start;cancel();if(!origin||touches!==0)return false;
   const dx=x-origin.x,dy=Math.abs(y-origin.y),elapsed=at-origin.at;
   if(dx<72||dy>32||dx<dy*3||elapsed<0||elapsed>800)return false;
   close();return true;
  },
 };
}
