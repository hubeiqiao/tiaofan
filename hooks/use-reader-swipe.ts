'use client';
import {useEffect,useRef,type TouchEvent} from 'react';
import {createReaderSwipe} from '@/lib/reader-swipe';
/** Observe only the static title strip. Never capture/prevent browser gestures. */
export function useReaderSwipe(enabled:boolean,close:()=>void){
 const current=useRef({enabled,close});current.current={enabled,close};
 const controller=useRef<ReturnType<typeof createReaderSwipe>|null>(null);
 controller.current??=createReaderSwipe(()=>{if(current.current.enabled)current.current.close()});
 useEffect(()=>{controller.current?.cancel();return()=>controller.current?.cancel()},[enabled]);
 return {
  onTouchStart(e:TouchEvent<HTMLElement>){
   const touch=e.touches[0],target=e.target as HTMLElement;
   const eligible=current.current.enabled&&!target.closest('button,a,input,select,textarea,[role=button],[contenteditable=true]')&&!window.getSelection()?.toString();
   if(touch)controller.current!.begin(touch.clientX,touch.clientY,e.timeStamp,window.innerWidth,e.touches.length,!!eligible);
  },
  onTouchMove(e:TouchEvent<HTMLElement>){if(window.getSelection()?.toString()){controller.current!.cancel();return}const touch=e.touches[0];if(touch)controller.current!.move(touch.clientX,touch.clientY,e.touches.length)},
  onTouchEnd(e:TouchEvent<HTMLElement>){if(window.getSelection()?.toString()){controller.current!.cancel();return}const touch=e.changedTouches[0];if(touch)controller.current!.end(touch.clientX,touch.clientY,e.timeStamp,e.touches.length)},
  onTouchCancel(){controller.current!.cancel()},
 };
}
