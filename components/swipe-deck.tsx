'use client';
import {useLocale,localizedPremiere} from '@/lib/i18n';
import {useEffect,useRef,useState,useCallback,type ReactNode,type PointerEvent,type RefObject} from 'react';
import {animate,motion,useDragControls,useMotionValue,useReducedMotion,useTransform,type PanInfo} from 'motion/react';
import {Bookmark,Check,ChevronLeft,ChevronRight,Info,RotateCcw,X,LoaderCircle} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {dateStatus} from '@/lib/catalog';
import {AnimePoster} from '@/components/anime-poster';
import type {Anime} from '@/lib/types';
import {swipeDirection,swipeSavedKeys,swipeRemaining,swipeIsChecking,swipeCanRetainCard,type SwipeReceipt,type SwipeLibraryStatus} from '@/lib/swipe';

type Entry={anime:Anime;action:'skip'|'want';receipt?:SwipeReceipt};
type Props={openerRef:RefObject<HTMLButtonElement|null>;open:boolean;onOpenChange:(v:boolean)=>void;items:Anime[];loading:boolean;libraryStatus:SwipeLibraryStatus;libraryError:string;onLibraryRetry:()=>void;identityMeta:Record<string,{mal?:string;conflicts?:{mal?:unknown}}>;paused:boolean;privateContext?:boolean;saved:Map<string,Anime>;summary:(a:Anime)=>string;scores:(a:Anime)=>ReactNode;matchScores:Record<string,number>;matchItems:Array<{bgm?:number;evidence?:Array<{label:string;text:string}>}>;onWant:(a:Anime)=>Promise<SwipeReceipt>;onUndo:(a:Anime,receipt:SwipeReceipt)=>Promise<boolean>;onDetail:(a:Anime)=>void};
const interactive='button,a,input,textarea,select,[role="button"],[contenteditable="true"]';
export function SwipeDeck(p:Props){
 const {locale,t:tr,translateKnown}=useLocale();
 const copy=(zh:string,en:string,ja:string)=>({zh,en,ja})[locale];
 const saveLabel=copy('保存','Save','保存');
 const [history,setHistory]=useState<Entry[]>([]),[currentKey,setCurrentKey]=useState(''),[leaving,setLeaving]=useState<'want'|'skip'|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failure,setFailure]=useState('');
 const choice=useRef<Anime|null>(null),retained=useRef<{anime:Anime;privateContext:boolean}|null>(null),card=useRef<HTMLElement|null>(null);
 const locked=useRef(false),alive=useRef(true),request=useRef(0),pending=useRef<number|null>(null),animations=useRef<Array<()=>void>>([]);
 const dragControls=useDragControls(),reduced=useReducedMotion();
 const x=useMotionValue(0),y=useMotionValue(0),scale=useMotionValue(1);
 const rotate=useTransform(x,[-400,0,400],[-12,0,12]);
 const saveOpacity=useTransform(x,[0,90],[0,1]),skipOpacity=useTransform(x,[-90,0],[1,0]);
 const underScale=useTransform(x,[-350,0,350],[1,.96,1]);
 const checkingLibrary=swipeIsChecking(p.libraryStatus),privateContext=p.privateContext??true;
 const latest=useRef(p);latest.current=p;
 const seen=new Set(history.map(h=>h.anime.key));
 const savedKeys=swipeSavedKeys(p.items,[...p.saved.values()],p.identityMeta);
 const remaining=swipeRemaining(p.items,seen,savedKeys);
 const candidate=choice.current||remaining.find(a=>a.key===currentKey)||remaining[0];
 const canRetain=swipeCanRetainCard(p.libraryStatus,privateContext)&&retained.current?.privateContext===privateContext;
 const current=checkingLibrary?(canRetain?retained.current?.anime:undefined):candidate;
 const showCard=!!current&&(!p.loading||checkingLibrary&&canRetain);
 const blocked=p.loading||checkingLibrary||p.paused||!p.open;
 const next=checkingLibrary?undefined:remaining.find(a=>a.key!==current?.key),last=history.at(-1);
 const saved=!checkingLibrary&&current?p.saved.get(current.key):undefined;
 const evidence=!checkingLibrary&&current?p.matchItems.find(m=>m.bgm===current.bgm)?.evidence:null;

 const stopAnimations=useCallback(()=>{for(const stop of animations.current)stop();animations.current=[];x.stop();y.stop();scale.stop()},[x,y,scale]);
 const resetPosition=useCallback(()=>{stopAnimations();x.jump(0);y.jump(0);scale.jump(1)},[stopAnimations,x,y,scale]);
 function springBack(velocity=0){
  stopAnimations();
  if(reduced){x.jump(0);y.jump(0);scale.jump(1);return Promise.resolve()}
  const options={type:'spring' as const,stiffness:380,damping:32,mass:.8};
  return new Promise<void>(resolve=>{
   const horizontal=animate(x,0,{...options,velocity,onComplete:resolve});
   const vertical=animate(y,0,options),size=animate(scale,1,options);
   animations.current=[()=>{horizontal.stop();vertical.stop();size.stop();resolve()}];
  });
 }
 function exitDistance(){return Math.max(card.current?.clientWidth||340,340)*1.35}
 function flyOut(action:'want'|'skip',velocity=0){
  stopAnimations();
  if(reduced)return Promise.resolve();
  return new Promise<void>(resolve=>{
   const flight=animate(x,(action==='want'?1:-1)*exitDistance(),{type:'spring',stiffness:280,damping:30,mass:.8,velocity,onComplete:resolve});
   animations.current=[()=>{flight.stop();resolve()}];
  });
 }
 function isCurrent(token:number){return alive.current&&request.current===token&&latest.current.open&&!latest.current.loading&&!latest.current.paused&&!swipeIsChecking(latest.current.libraryStatus)}
 function settle(token:number){if(alive.current&&pending.current===token){pending.current=null;locked.current=false;setBusy(false);setLeaving(null)}}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;dragControls.cancel();stopAnimations()}},[dragControls,stopAnimations]);
 useEffect(()=>{
  if(blocked){request.current++;dragControls.cancel();resetPosition();setLeaving(null)}
 },[blocked,p.libraryStatus,p.open,dragControls,resetPosition]);
 useEffect(()=>{
  if(!p.open){setCurrentKey('');retained.current=null;choice.current=null;resetPosition();return}
  if(!checkingLibrary&&!p.loading){
   retained.current=current?{anime:current,privateContext}:null;
   if(current?.key!==currentKey)setCurrentKey(current?.key||'');
  }
  if(checkingLibrary&&!canRetain)retained.current=null;
 },[p.open,p.loading,checkingLibrary,current,currentKey,privateContext,canRetain,resetPosition]);

 async function choose(action:'skip'|'want',velocity=0){
  if(locked.current||blocked||!current)return;
  const token=++request.current,a=current;
  locked.current=true;pending.current=token;choice.current=a;
  setBusy(true);setLeaving(action);setFailure('');setMessage('');
  const flight=flyOut(action,velocity);
  try{
   // The card can fly while the request is pending, but history and selection
   // never advance until the owner confirms the exact mutation receipt.
   const receipt=action==='want'?await p.onWant(a):undefined;
   if(!isCurrent(token))return;
   await flight;
   if(!isCurrent(token))return;
   setHistory(h=>[...h,{anime:a,action,receipt}]);
   choice.current=null;setCurrentKey('');resetPosition();
   setMessage(action==='skip'?tr('这部已跳过，仅对本轮有效。'):receipt?.changed?copy('已保存到你的追番列表。','Saved to your list.','マイリストに保存しました。'):tr('已在你的追番中，保留原有状态。'));
   if(!reduced){scale.jump(.97);const entry=animate(scale,1,{type:'spring',stiffness:350,damping:28});animations.current=[()=>entry.stop()]}
  }catch(e){
   if(isCurrent(token)){
    setFailure((e as Error).message||tr('保存失败，请重试。'));
    setLeaving(null);await springBack();
   }
  }finally{
   if(alive.current&&pending.current===token){choice.current=null;settle(token)}
  }
 }
 async function undo(){
  if(locked.current||blocked||!last)return;
  const token=++request.current;locked.current=true;pending.current=token;setBusy(true);setFailure('');setMessage('');
  try{
   let canReturn=!last.receipt;
   if(last.receipt?.changed){
    const reverted=await p.onUndo(last.anime,last.receipt);
    if(!isCurrent(token))return;
    canReturn=reverted;
    if(!reverted)setFailure(copy('这条追番后来已更新，未撤销保存；仍会排除这部作品。','This saved title was updated later, so it stays saved and excluded.','保存後に変更された作品のため、保存は取り消していません。引き続き候補から除外します。'));
   }
   if(!isCurrent(token))return;
   setHistory(h=>h.slice(0,-1));setCurrentKey(canReturn?last.anime.key:'');
   setMessage(canReturn?tr('已返回上一张卡。'):copy('原有追番已保留，继续排除。','The existing saved title remains excluded.','以前の保存状態を保持し、引き続き候補から除外します。'));
   if(canReturn){resetPosition();if(!reduced)x.jump((last.action==='want'?1:-1)*exitDistance());await springBack()}
  }catch(e){if(isCurrent(token))setFailure((e as Error).message||tr('撤销未成功，请重试。'))}
  finally{settle(token)}
 }
 function down(e:PointerEvent<HTMLElement>){
  if(locked.current||blocked||e.button!==0||!e.isPrimary||(e.target as HTMLElement).closest(interactive))return;
  stopAnimations();dragControls.start(e,{distanceThreshold:10});
 }
 function dragEnd(event:MouseEvent|TouchEvent|globalThis.PointerEvent,info:PanInfo){
  if(event.type==='pointercancel'||locked.current||blocked){if(!locked.current)void springBack();return}
  const action=swipeDirection(info.offset.x,info.offset.y,card.current?.clientWidth||340,info.velocity.x);
  if(action)void choose(action,info.velocity.x);else void springBack(info.velocity.x);
 }
 function cancelDrag(){dragControls.cancel();if(!locked.current)void springBack()}
 const translatedFailure=translateKnown(failure);
 const failureLabel=locale==='ja'&&translatedFailure===failure&&!/[\u3040-\u30ff]/.test(failure)?'処理の結果を確認できませんでした。もう一度お試しください。':translatedFailure;
 return <Dialog open={p.open} onOpenChange={v=>{if(!locked.current)p.onOpenChange(v)}}>
  <DialogContent placement="custom" className="swipe-dialog" showCloseButton={false} onCloseAutoFocus={e=>{e.preventDefault();p.openerRef.current?.focus()}} onEscapeKeyDown={e=>{if(locked.current)e.preventDefault()}} onPointerDownOutside={e=>e.preventDefault()} onKeyDown={e=>{
   if(blocked||e.altKey||e.ctrlKey||e.metaKey||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))return;
   if(e.key==='ArrowRight'){e.preventDefault();void choose('want')}
   if(e.key==='ArrowLeft'){e.preventDefault();void choose('skip')}
   if(e.key.toLowerCase()==='z'){e.preventDefault();void undo()}
  }}>
   <header className="swipe-heading"><div><DialogTitle>{tr('一张张挑，选到想看的')}</DialogTitle><DialogDescription>{checkingLibrary?copy('正在核对追番列表…','Checking your saved list…','マイリストを確認しています…'):<>{tr('沿用当前筛选与排序 · 本轮已看')}{history.length} / {history.length+remaining.length}</>}</DialogDescription></div><button className="dialog-close-control" aria-label={tr('返回普通列表')} onClick={()=>p.onOpenChange(false)} disabled={busy}><X size={21}/></button></header>
   <div className="swipe-stage" aria-busy={busy||checkingLibrary||p.loading}>
    {showCard&&current?<>
     <motion.div className="swipe-under" aria-hidden="true" style={{scale:reduced?1:underScale}}>{next&&<AnimePoster image={next.image} bgm={next.bgm} alt="" sizes="(max-width:700px) 90vw, 360px"/>}</motion.div>
     <motion.article ref={card} className="swipe-card" data-swipe-key={current.key} data-swipe-phase={leaving?'pending-'+leaving:busy?'undo':checkingLibrary?'checking':'ready'} style={{x,y,rotate:reduced?0:rotate,scale,touchAction:'pan-y',transition:'none'}} drag="x" dragControls={dragControls} dragListener={false} dragMomentum={false} dragElastic={0} onPointerDown={down} onDragEnd={dragEnd} onPointerCancel={cancelDrag} onDrag={(_event,info)=>{if(!locked.current&&!blocked)y.set(reduced?0:Math.max(-24,Math.min(24,info.offset.y*.08)))}}>
      <div className="swipe-art"><AnimePoster image={current.image} bgm={current.bgm} alt={current.name} sizes="(max-width:700px) 90vw, 360px" loading="eager"/>
       <motion.div className="swipe-stamp want" style={{opacity:saveOpacity}} aria-hidden="true">{saveLabel}</motion.div><motion.div className="swipe-stamp skip" style={{opacity:skipOpacity}} aria-hidden="true">{tr('先跳过')}</motion.div>
       {saved&&<span className="swipe-saved"><Check size={14}/>{copy('已保存','Saved','保存済み')}{saved.state&&saved.state!=='saved'?' · '+({want:tr('想看'),watching:tr('在看'),done:tr('看完')} as Record<string,string>)[saved.state]:''}</span>}
      </div>
      <div className="swipe-copy">{dateStatus(current)!=='aired'&&<p className="swipe-premiere">{localizedPremiere(current.date,locale,undefined,current.format)}</p>}<h2>{current.name}</h2><div className="swipe-ratings">{p.scores(current)}{!checkingLibrary&&p.matchScores[current.bgm!]!=null&&<span className="match-score">{tr('AI匹配')}{Math.round(p.matchScores[current.bgm!]*100)}</span>}</div><p className="swipe-hook">{p.summary(current)}</p>{evidence?.[0]?<p className="swipe-reason"><strong>{translateKnown(evidence[0].label)}{copy('：',': ','：')}</strong>{translateKnown(evidence[0].text)}</p>:current.editorial?.watchPoints?.[0]?<p className="swipe-reason">{translateKnown(current.editorial.watchPoints[0])}</p>:current.review?.strengths?.[0]?<p className="swipe-reason">{translateKnown(current.review.strengths[0])}</p>:null}<button className="swipe-detail" onClick={()=>p.onDetail(current)} disabled={busy||checkingLibrary&&privateContext}><Info size={15}/>{tr('详情、真实评价与观看入口')}<ChevronRight size={15}/></button></div>
     </motion.article>
    </>:p.libraryStatus==='error'?<div className="swipe-empty" role="alert"><h3>{copy('暂时无法核对已追番作品','Could not check your saved list','保存済み作品を確認できませんでした')}</h3><p>{copy('重试成功后继续，避免重复推荐已收录作品。','Retry before continuing so saved titles are not shown again.','保存済みの作品を重複して表示しないよう、再試行が成功してから続けます。')}</p><button onClick={p.onLibraryRetry}>{tr('重试')}</button></div>:p.loading||checkingLibrary?<div className="swipe-empty"><LoaderCircle className="spinning"/><h3>{tr('正在准备当前片单')}</h3><p>{checkingLibrary?copy('正在核对当前浏览器登录状态与追番列表…','Checking this browser’s sign-in and saved list…','現在のブラウザーのログイン状態とマイリストを確認しています…'):tr('评分与偏好条件就绪后继续。')}</p></div>:<div className="swipe-empty"><Check size={38}/><h3>{p.items.length?(savedKeys.size===p.items.length?copy('这些作品都已在你的追番中','These titles are already saved','これらの作品はすべて保存済みです'):tr('这轮已经挑完了')):tr('当前筛选没有作品')}</h3><p>{copy('左划只跳过本轮，右划的作品已保存在追番中。','Left swipes skip this round. Right swipes save titles to your list.','左スワイプは今回のみスキップし、右スワイプはマイリストに保存します。')}</p><button onClick={()=>{setHistory([]);setCurrentKey('');setMessage('');setFailure('')}}>{tr('重新浏览这轮')}</button><button onClick={()=>p.onOpenChange(false)}>{tr('回到列表调整筛选')}</button></div>}
   </div>
   <div className="swipe-feedback" aria-live="polite">{checkingLibrary?<>{p.libraryStatus==='error'?copy('核对失败，请重试后继续。','Verification failed. Retry to continue.','確認できませんでした。再試行してください。'):showCard?copy('核对中，当前卡片会保留。','Checking. Your current card stays here.','確認中です。現在のカードを保持しています。'):copy('请等待追番列表核对完成。','Wait until your saved list is confirmed.','マイリストの確認が終わるまでお待ちください。')}{p.libraryStatus==='error'&&showCard&&<button onClick={p.onLibraryRetry}>{tr('重试')}</button>}</>:<>{p.libraryStatus==='guest'&&<span>{copy('当前浏览器未登录；登录后才能排除你的已追番作品。 ','This browser is signed out; saved-title exclusion requires sign-in. ','このブラウザーではログインしていません。保存済み作品を除外するにはログインが必要です。')}</span>}{failure?<span role="alert">{failureLabel}</span>:busy?leaving==='want'?tr('正在保存，请稍候…'):copy('正在处理…','One moment…','処理中…'):translateKnown(message)||copy('左划先跳过 · 右划保存 · 键盘方向键也能操作','Swipe left to skip · right to save · or use arrow keys','左でスキップ · 右で保存 · 矢印キーでも操作できます')}</>}</div>
   <footer className="swipe-controls"><button className="swipe-undo action-quiet" aria-label={tr('撤销上一张')} disabled={busy||blocked||!last} onClick={()=>void undo()}><RotateCcw size={21}/><span>{locale==='ja'?'戻す':tr('撤销')}</span></button><button className="swipe-skip action-secondary" disabled={busy||blocked||!current} onClick={()=>void choose('skip')}><ChevronLeft size={23}/><span>{tr('先跳过')}</span></button><button className="swipe-want action-primary" disabled={busy||blocked||!current} onClick={()=>void choose('want')}>{busy&&leaving==='want'?<LoaderCircle size={21} className="spinning"/>:<Bookmark size={21}/>}<span>{saveLabel}</span></button></footer>
  </DialogContent>
 </Dialog>;
}
