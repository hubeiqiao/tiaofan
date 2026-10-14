/** Reading position stays in memory. Layout clamping must never replace user intent. */
type Position = {top:number;height:number};
type Scroller = Pick<HTMLElement,'scrollTop'|'scrollHeight'|'clientHeight'|'clientWidth'|'isConnected'>;
type Driver = {getNode:()=>Scroller|null;canRead:()=>boolean;viewport:()=>string;requestFrame:(fn:()=>void)=>number;cancelFrame:(id:number)=>void};
export function createDetailScrollCoordinator(position:{current:Position},driver:Driver){
 let generation=0,frame:number|null=null,restoring=false,settledViewport:string|null=null,settledGeometry='',appliedTop:number|null=null;
 const geometry=(node:Scroller)=>[node.clientWidth,node.clientHeight,node.scrollHeight].join(':');
 const current=(node:Scroller|null):node is Scroller=>!!node&&node.isConnected!==false&&node===driver.getNode()&&driver.canRead();
 function cancel(){generation++;if(frame!==null)driver.cancelFrame(frame);frame=null;restoring=true;}
 function restore(){
  cancel();const token=generation,intended=position.current.top;let previous='',attempt=0;
  const step=()=>{
   if(token!==generation)return;frame=null;const node=driver.getNode();if(!current(node))return;
   const before=[driver.viewport(),geometry(node)].join('|');
   const maximum=Number.isFinite(node.clientHeight)?Math.max(0,node.scrollHeight-node.clientHeight):Infinity;
   const target=Math.min(Math.max(0,intended),maximum);node.scrollTop=target;appliedTop=node.scrollTop;
   position.current.height=node.scrollHeight;
   if(previous===before&&Math.abs(node.scrollTop-target)<1||++attempt>=8){settledViewport=driver.viewport();settledGeometry=geometry(node);restoring=false;return;}
   previous=before;frame=driver.requestFrame(step);
  };
  frame=driver.requestFrame(step);
  return()=>{if(token===generation)cancel()};
 }
 function record(node:Scroller){
  if(!current(node)||restoring)return;
  if(settledViewport!==null&&(settledViewport!==driver.viewport()||settledGeometry!==geometry(node))){restore();return;}
  if(appliedTop!==null&&Math.abs(node.scrollTop-appliedTop)<1)return;
  position.current={top:node.scrollTop,height:node.scrollHeight};appliedTop=null;settledViewport=driver.viewport();settledGeometry=geometry(node);
 }
 function accept(node:Scroller){
  if(!current(node))return;cancel();restoring=false;appliedTop=null;settledViewport=driver.viewport();settledGeometry=geometry(node);position.current={top:node.scrollTop,height:node.scrollHeight};
 }
 function startInput(node:Scroller){
  if(!current(node))return;cancel();restoring=false;appliedTop=node.scrollTop;settledViewport=driver.viewport();settledGeometry=geometry(node);
 }
 return {restore,record,accept,startInput,cancel,reset(){cancel();position.current={top:0,height:0};settledViewport=null;settledGeometry='';appliedTop=null},geometryChanged(){const node=driver.getNode();return !restoring&&current(node)&&(settledViewport!==driver.viewport()||settledGeometry!==geometry(node))}};
}
