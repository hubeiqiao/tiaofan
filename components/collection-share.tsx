'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {ArrowDown, ArrowUp, Check, Copy, Download, ImagePlus, MoreHorizontal, RotateCcw, Share2, X} from 'lucide-react';
import {AnimePoster} from '@/components/anime-poster';
import {collageShareMessage, createShareCollage, safeCollageText, shareCollageFile, type CollageItem, type CollageLanguage} from '@/lib/share-collage';

export type CollectionShareProps = {items: readonly CollageItem[]; language?: CollageLanguage; title?: string; theme?: 'light' | 'dark'; paused?:boolean; readOnly?:boolean; embedded?:boolean; selectedKeys?:readonly string[]; onSelectionChange?:(keys:string[])=>void};
/** The owner's selection, generated image, and draft stay in this browser until an explicit share click. */
export function CollectionShare({items, language = 'zh', title, theme = 'light', paused=false, readOnly=false, embedded=false, selectedKeys, onSelectionChange}: CollectionShareProps) {
  const id = useId();
  const surface=useRef<HTMLDivElement|null>(null),choices=useRef<HTMLDivElement|null>(null),scroll=useRef({top:0,choices:0,height:0});
  useEffect(()=>{if(paused)return;const node=surface.current;if(!node)return;node.scrollTop=scroll.current.top;if(choices.current)choices.current.scrollTop=scroll.current.choices;const capture=()=>{scroll.current.height=node.scrollHeight};capture();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(capture);observer?.observe(node);return()=>observer?.disconnect()},[paused]);
  const copy = (zh: string, en: string, ja: string) => ({zh, en, ja})[language];
  const [keys,setKeys]=useState<string[]>([]),[invitation,setInvitation]=useState(true);
  const alive=useRef(true),generating=useRef(false),sharing=useRef(false),generationEpoch=useRef(0),wasPaused=useRef(paused||readOnly);
  if((paused||readOnly)&&!wasPaused.current)generationEpoch.current++;wasPaused.current=paused||readOnly;
  const [query,setQuery]=useState(''),[busy,setBusy]=useState(false),[shareBusy,setShareBusy]=useState(false),[error,setError]=useState('');
  const [shareStatus,setShareStatus]=useState(''),[fallback,setFallback]=useState(false),[manualCaption,setManualCaption]=useState(false);
  const [result,setResult]=useState<{url:string;file:File|null;missing:string[];signature:string}|null>(null);
  const effectiveKeys=selectedKeys||keys;
  const updateKeys=(next:string[])=>{setKeys(next);onSelectionChange?.(next)};
  const selected=effectiveKeys.flatMap(key=>{const item=items.find(item=>item.key===key);return item?[item]:[]});
  const signature=JSON.stringify([selected.map(({key,name,image,bgm})=>({key,name,image,bgm})),language,title,theme,invitation]);
  const latestSignature=useRef(signature);latestSignature.current=paused||readOnly?'VERIFYING_ACCOUNT':signature;
  const resetSignature=useRef(signature);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
  useEffect(()=>{if(!paused&&resetSignature.current!==signature){resetSignature.current=signature;setResult(null);setError('');setShareStatus('');setFallback(false);setManualCaption(false)}},[signature,paused]);
  useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
  const ready=result?.signature===signature?result:null;
  const blocked=readOnly||busy||shareBusy;
  const lastPreview=useRef<string|null>(null);
  useEffect(()=>{if(!paused&&ready&&lastPreview.current!==ready.url){lastPreview.current=ready.url;scroll.current.top=0;if(surface.current)surface.current.scrollTop=0}},[ready,paused]);
  function editSelection(){if(paused||blocked)return;setResult(null);setError('');setShareStatus('');setFallback(false);setManualCaption(false);scroll.current.top=0;if(surface.current)surface.current.scrollTop=0}
  const visible=items.filter((item,index)=>items.findIndex(other=>other.key===item.key)===index&&item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  function toggle(key:string){if(paused||blocked)return;const valid=effectiveKeys.filter(value=>items.some(item=>item.key===value));updateKeys(valid.includes(key)?valid.filter(value=>value!==key):valid.length<9?[...valid,key]:[...valid])}
  function move(index:number,delta:number){if(paused||blocked)return;const next=selected.map(item=>item.key),destination=index+delta;if(destination<0||destination>=next.length)return;[next[index],next[destination]]=[next[destination],next[index]];updateKeys(next)}
  async function generate(){
    if(paused||readOnly||sharing.current||generating.current||selected.length!==9)return;
    generating.current=true;setBusy(true);setError('');setResult(null);setShareStatus('');setFallback(false);setManualCaption(false);
    const captured=signature,epoch=generationEpoch.current;
    try{
      const output=await createShareCollage(selected,{language,title,theme,invitation});
      if(alive.current&&generationEpoch.current===epoch&&latestSignature.current===captured){
        const name=output.missingArtwork.length?'tiaofan-my-anime-nine-title-cards.png':'tiaofan-my-anime-nine.png';
        const file=typeof File==='function'?new File([output.blob],name,{type:'image/png'}):null;
        setResult({url:URL.createObjectURL(output.blob),file,missing:output.missingArtwork,signature:captured});
      }
    }catch(cause){if(alive.current&&generationEpoch.current===epoch&&latestSignature.current===captured)setError(language!=='ja'&&cause instanceof Error?cause.message:copy('图片生成失败，请重试。','Could not create the image. Please try again.','画像を生成できませんでした。もう一度お試しください。'))}
    finally{generating.current=false;if(alive.current)setBusy(false)}
  }
  async function share(){
    if(paused||blocked||sharing.current||!ready||latestSignature.current!==signature)return;
    sharing.current=true;setShareBusy(true);setShareStatus('');setError('');
    const captured=signature,epoch=generationEpoch.current;
    // The File already exists. This call reaches navigator.share in the original click stack.
    const outcome=await shareCollageFile(ready.file,language,undefined,invitation);
    sharing.current=false;
    if(!alive.current)return;
    setShareBusy(false);
    if(generationEpoch.current!==epoch||latestSignature.current!==captured)return;
    if(outcome==='returned')setShareStatus(copy('系统分享已返回。是否发送成功，请以目标应用为准。','The system share flow has returned. Check your chosen app to confirm it was sent.','共有画面から戻りました。送信結果は選んだアプリでご確認ください。'));
    else if(outcome==='cancelled')setShareStatus(copy('未完成分享，图片仍保留在这里。','Sharing wasn’t completed. Your image is still here.','共有は完了していません。画像はここに残っています。'));
    else{setFallback(true);setShareStatus(outcome==='unsupported'?copy('这个浏览器暂不支持直接分享图片，可使用下面的其他方式。','This browser can’t share image files directly. Use another option below.','このブラウザーでは画像を直接共有できません。下の方法をお使いください。'):copy('未能打开图片分享，可重试或使用其他方式。','Couldn’t share the image. Try again or use another option.','画像を共有できませんでした。再試行するか、別の方法をお使いください。'))}
  }
  const message=collageShareMessage(language,invitation),caption=message.text+(message.url?'\n'+message.url:'');
  async function copyCaption(){
    if(paused||blocked||!ready||latestSignature.current!==signature)return;
    const captured=signature,epoch=generationEpoch.current;
    try{
      if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(caption);
      if(alive.current&&generationEpoch.current===epoch&&latestSignature.current===captured)setShareStatus(copy('文案已复制。图片需要另外添加。','Caption copied. Attach the image separately.','文章をコピーしました。画像は別途添付してください。'));
    }catch{if(alive.current&&generationEpoch.current===epoch&&latestSignature.current===captured){setManualCaption(true);setShareStatus(copy('请长按下面的文案手动复制。','Select the caption below to copy it manually.','下の文章を選択してコピーしてください。'))}}
  }
  return <section className="collection-share" data-theme={theme} data-stage={ready?'preview':'choose'} lang={language==='zh'?'zh-CN':language} aria-label={paused?copy('核对片单','Verifying your library','リストの確認'):embedded?copy('分享片单','Share picks','おすすめを画像に'):undefined} aria-labelledby={paused||embedded?undefined:id+'-heading'}>
    <div ref={surface} onScroll={event=>{if(!paused){scroll.current.top=event.currentTarget.scrollTop;scroll.current.height=event.currentTarget.scrollHeight}}} className="cs-scroll">
    {paused?<div className="share-verification-mask" style={{minHeight:scroll.current.height||360}}><p role="status">{copy('正在核对片单，确认后恢复编辑。','Checking your library. Your draft will return after verification.','マイリストを確認しています。確認後に編集を再開できます。')}</p></div>:<>
      {!embedded&&<><div className="cs-heading"><h3 id={id+'-heading'}>{copy('分享片单','Share picks','おすすめを画像に')}</h3></div><p className="cs-intro">{copy('选 9 部，分享你的动画品味。不会自动发布。','Pick nine. Share your anime taste. Nothing is posted automatically.','9作品を選んで、好きなアニメをシェア。自動投稿は行いません。')}</p></>}
      {!items.length?<p className="cs-empty">{copy('先把想推荐的动画加入收藏，再来制作你的九宫格。','Add some favorites to your collection first.','まず、おすすめしたいアニメをお気に入りに追加してください。')}</p>:<>
        {readOnly&&<p className="cs-hint" role="status">{copy('正在核对片单，确认后即可继续选择和分享。','Checking your library. Selection and sharing will resume after verification.','マイリストを確認しています。確認後に選択・共有を再開できます。')}</p>}
        <div className="cs-layout" hidden={!!ready} data-has-selection={selected.length>0}>
          <div className="cs-selection">
            <div className="cs-selection-header"><label className="cs-label" htmlFor={id+'-search'}>{copy('选出你的 9 部','Choose your nine','あなたの9作品を選ぶ')}</label><span className="cs-count" role="status">{selected.length} / 9</span></div>
            <div className="cs-picked-strip" aria-label={copy('已选作品，点击可移除','Selected titles. Tap to remove.','選択済みの作品。タップで外せます。')}>{Array.from({length:9},(_,index)=>{const item=selected[index];return item?<button key={item.key} type="button" disabled={blocked} onClick={()=>toggle(item.key)} aria-label={copy(`将${item.name}移出分享图`,`Remove ${item.name} from image`,`「${item.name}」を画像から外す`)}><AnimePoster image={item.image} bgm={item.bgm} sizes="44px"/><span>{index+1}</span></button>:<span key={'empty:'+index} className="cs-picked-empty" aria-hidden="true">{index+1}</span>})}</div>
            {selected.length>0&&<details className="cs-arrangement"><summary>{copy('调整顺序','Adjust order','順序を調整')}</summary><p className="cs-hint">{copy('从左到右，从上到下排列。','Left to right, then top to bottom.','左から右、上から下に並びます。')}</p><ol className="cs-order">{selected.map((item,index)=><li key={item.key}><span className="cs-order-number">{String(index+1).padStart(2,'0')}</span><span className="cs-order-name">{safeCollageText(item.name)}</span><div className="cs-order-actions"><button type="button" disabled={blocked||index===0} onClick={()=>move(index,-1)} aria-label={copy(`将${item.name}前移`,`Move ${item.name} earlier`,`「${item.name}」を前へ移動`)}><ArrowUp size={16}/></button><button type="button" disabled={blocked||index===selected.length-1} onClick={()=>move(index,1)} aria-label={copy(`将${item.name}后移`,`Move ${item.name} later`,`「${item.name}」を後ろへ移動`)}><ArrowDown size={16}/></button><button type="button" disabled={blocked} onClick={()=>toggle(item.key)} aria-label={copy(`将${item.name}移出分享图`,`Remove ${item.name} from image`,`「${item.name}」を画像から外す`)}><X size={16}/></button></div></li>)}</ol></details>}
            <input className="editorial-input" id={id+'-search'} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy('搜索收藏作品','Search favorites','お気に入りの作品を検索')} disabled={blocked}/>
            <div ref={choices} onScroll={event=>{if(!paused)scroll.current.choices=event.currentTarget.scrollTop}} className="cs-options" aria-label={copy('收藏作品','Favorite titles','お気に入りの作品')}>{visible.map(item=>{const position=selected.findIndex(value=>value.key===item.key);return <button type="button" key={item.key} aria-pressed={position>=0} disabled={blocked||(selected.length>=9&&position<0)} onClick={()=>toggle(item.key)}><span className="cs-option-art"><AnimePoster image={item.image} bgm={item.bgm} sizes="(max-width: 700px) 28vw, 150px"/><span className="cs-marker" aria-hidden="true">{position>=0?<><Check size={13}/>{position+1}</>:'+'}</span></span><span className="cs-option-name">{safeCollageText(item.name)}</span></button>})}{!visible.length&&<p>{copy('没有找到匹配的作品。','No matching titles.','一致する作品はありません。')}</p>}</div>
          </div>
          <label className="cs-invitation-choice"><input type="checkbox" checked={invitation} disabled={blocked} onChange={event=>setInvitation(event.target.checked)}/><span>{copy('加入「来挑番，做你的九宫格」邀请','Include a “Make your own on Tiaofan” invitation','「ティアオファンであなたの9選を」の案内を入れる')}</span></label>
        </div>
        {!selected.length&&<p className="cs-selection-hint">{copy('选满九部作品后，即可预览分享图。','Choose nine titles to preview your collage.','9作品を選ぶと共有画像を確認できます。')}</p>}
        <div aria-live="polite" aria-atomic="true">{busy&&<p className="cs-hint">{copy('正在准备海报…','Preparing artwork…','ポスターを準備しています…')}</p>}{error&&<p role="alert" className="cs-warning">{error}</p>}{shareStatus&&<p className="cs-share-status" role="status">{shareStatus}</p>}</div>
        {ready&&<div className="cs-output">
          <div className="cs-preview-controls"><button className="cs-edit" type="button" disabled={blocked} onClick={editSelection}>{copy('重新选 / 调顺序','Edit picks / order','作品・順序を変更')}</button><span role="status">{copy(`${9-ready.missing.length} / 9 张海报`,`${9-ready.missing.length} / 9 posters`,`ポスター ${9-ready.missing.length} / 9`)}</span></div>
          {ready.missing.length>0&&<div className="cs-warning cs-incomplete"><p role="status">{copy(`还缺 ${ready.missing.length} 张海报。可重试，或选择分享含文字卡的版本。`,`${ready.missing.length} posters are missing. This image is incomplete. Retry, or choose to share with title cards.`,`ポスターが${ready.missing.length}枚不足しています。再試行するか、タイトルカード入りの画像を共有できます。`)}</p><details><summary>{copy('查看未加载的作品','View missing artwork','読み込めなかった作品')}</summary><p>{ready.missing.join(language==='en'?', ':'、')}</p><p>{copy('来源可能暂不可用，或不允许浏览器导出海报。','The source may be unavailable or may not allow browser export.','配信元に接続できないか、ブラウザーからの書き出しが許可されていない可能性があります。')}</p></details></div>}
          <img className="cs-result" width={1440} height={1800} src={ready.url} alt={copy(`分享图预览：${selected.map(item=>item.name).join('、')}`,`Share collage preview: ${selected.map(item=>item.name).join(', ')}`,`共有用画像のプレビュー：${selected.map(item=>item.name).join('、')}`)}/>
          <p className="cs-share-prompt">{copy('你看过几部？发给同好，一起聊聊。','How many have you seen? Send it to an anime friend.','何作品見た？アニメ好きの友だちと話してみよう。')}</p>
          {fallback&&<div className="cs-fallback"><p>{copy('也可以保存图片，再到喜欢的应用里发送。复制文案不会附带图片。','You can save the image and attach it in your app. Copying the caption does not include the image.','画像を保存して、お好きなアプリで添付できます。文章のコピーに画像は含まれません。')}</p><div className="cs-fallback-actions"><a className="cs-download action-secondary" aria-disabled={readOnly||shareBusy||undefined} onClick={event=>{if(readOnly||shareBusy)event.preventDefault()}} href={readOnly||shareBusy?undefined:ready.url} download={readOnly||shareBusy?undefined:ready.missing.length?'tiaofan-my-anime-nine-title-cards.png':'tiaofan-my-anime-nine.png'}><Download size={17}/>{ready.missing.length?copy('保存含文字卡的图片','Save with title cards','タイトルカード入りで保存'):copy('保存图片','Save image','画像を保存')}</a><button className="cs-copy action-secondary" type="button" disabled={blocked} onClick={()=>void copyCaption()}><Copy size={17}/>{copy('复制分享文案','Copy caption','文章をコピー')}</button></div>{manualCaption&&<textarea className="cs-caption" aria-label={copy('分享文案','Share caption','共有する文章')} readOnly value={caption} onFocus={event=>event.currentTarget.select()}/>}</div>}
        </div>}
        <details className="cs-privacy"><summary>{copy('图片与隐私','Artwork & privacy','画像とプライバシー')}</summary><p>{copy('图片在你的设备上生成。仅向原海报来源读取图片，不会将片单上传至新服务。由你选择分享的应用和接收人。海报版权归各自权利人所有。','Created on your device using existing poster hosts. Your collection is not uploaded to a new service. You choose the sharing app and recipient. Artwork belongs to its respective rights holders.','画像は元の配信元のポスターを使い、この端末で生成します。マイリストを新しいサービスへアップロードすることはありません。共有先はご自身で選びます。ポスターの権利は各権利者に帰属します。')}</p></details>
      </>}
    </>}
    </div>
    {!paused&&items.length>0&&<footer className="cs-toolbar">{ready?<>
      {ready.missing.length>0&&<button className="cs-retry action-primary" type="button" onClick={()=>void generate()} disabled={blocked}><RotateCcw size={19}/>{copy('重试加载海报','Retry missing posters','ポスターを再読み込み')}</button>}
      <button className={'cs-share '+(ready.missing.length?'action-secondary':'action-primary')} type="button" disabled={blocked} onClick={()=>void share()}><Share2 size={19}/>{shareBusy?copy('正在分享…','Sharing…','共有しています…'):ready.missing.length?copy('分享文字卡版','Share with title cards','タイトルカードで共有'):copy('分享图片','Share image','画像をシェア')}</button>
      <button className="cs-more" type="button" disabled={blocked} aria-expanded={fallback} onClick={()=>setFallback(value=>!value)} aria-label={copy('其他分享方式','More sharing options','ほかの共有方法')}><MoreHorizontal size={22}/></button>
    </>:<button className="cs-create action-primary" type="button" onClick={()=>void generate()} disabled={blocked||selected.length!==9}><ImagePlus size={19}/>{busy?copy('正在生成图片…','Creating image…','画像を生成しています…'):copy('预览分享图','Preview my collage','共有画像を確認')}</button>}{!ready&&<span>{selected.length===9?copy('选好了，看看效果','Ready for a preview','プレビューできます'):copy(`还差 ${9-selected.length} 部`,`Choose ${9-selected.length} more`,`あと${9-selected.length}作品`)}</span>}</footer>}
  </section>;
}
