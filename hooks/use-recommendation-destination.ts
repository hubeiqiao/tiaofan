'use client';
import {useEffect,useRef,useState} from 'react';
import {createRecommendationNavigation} from '@/lib/recommendation-navigation';
export function useRecommendationDestination(options:{getReturnScroll:()=>number;restore:(top:number)=>void;onLeave:()=>void;dismissChild:()=>boolean}){
 const current=useRef(options);current.current=options;
 const [open,setOpen]=useState(false),owner=useRef<ReturnType<typeof createRecommendationNavigation>|null>(null);
 const origin=useRef({top:0,opener:null as HTMLElement|null}),frame=useRef<number|null>(null);
 useEffect(()=>{
  const cancel=()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null;};
  const controller=createRecommendationNavigation({history:window.history,location:()=>window.location,token:crypto.randomUUID(),
   enter(capture){cancel();if(capture){let top=window.scrollY;try{top=current.current.getReturnScroll()}catch{}origin.current={top,opener:document.activeElement as HTMLElement};}setOpen(true);frame.current=requestAnimationFrame(()=>{frame.current=null;if(!controller.isOpen())return;window.scrollTo({top:0,behavior:'instant'});document.getElementById('recommendation-title')?.focus({preventScroll:true});});},
   leave(restore){cancel();current.current.onLeave();setOpen(false);if(restore)frame.current=requestAnimationFrame(()=>{frame.current=null;if(controller.isOpen())return;current.current.restore(origin.current.top);const target=origin.current.opener?.isConnected?origin.current.opener:document.querySelector<HTMLElement>('.gallery-recommendation-entry');target?.focus({preventScroll:true});});},
   dismissChild:()=>current.current.dismissChild(),
  });
  owner.current=controller;controller.start();const pop=()=>controller.pop();window.addEventListener('popstate',pop);window.addEventListener('hashchange',pop);
  return()=>{cancel();window.removeEventListener('popstate',pop);window.removeEventListener('hashchange',pop);controller.dispose();owner.current=null;};
 },[]);
 return {open,show:()=>owner.current?.show(),leave:(restore=true)=>owner.current?.leave(restore),isOpen:()=>owner.current?.isOpen()??false,returnScroll:()=>origin.current.top};
}
