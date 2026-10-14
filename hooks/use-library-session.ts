'use client';
import {useEffect,useRef,useState} from 'react';
import {createLibrarySession,initialLibraryState} from '@/lib/library-session';
import {createLibraryResumeCoordinator} from '@/lib/library-resume';

export function useLibrarySession(reload:number,open:boolean){
 const [state,setState]=useState(initialLibraryState);
 const [library]=useState(()=>createLibrarySession(setState));
 const previousReload=useRef(reload);
 const resumeRef=useRef<ReturnType<typeof createLibraryResumeCoordinator>|null>(null);

 // This lifecycle owns disposal. Changing reload or opening/closing the screening
 // dialog must not dispose the session or invalidate a verified deck identity.
 useEffect(()=>{
  const resume=createLibraryResumeCoordinator(library,()=>document.visibilityState==='visible');resumeRef.current=resume;
  window.addEventListener('focus',resume.onFocus);
  window.addEventListener('blur',resume.onBlur);
  window.addEventListener('pageshow',resume.onPageShow);
  window.addEventListener('pagehide',resume.onPageHide);
  document.addEventListener('visibilitychange',resume.onVisibilityChange);
  resume.start();
  return()=>{
   window.removeEventListener('focus',resume.onFocus);
   window.removeEventListener('blur',resume.onBlur);
   window.removeEventListener('pageshow',resume.onPageShow);
   window.removeEventListener('pagehide',resume.onPageHide);
   document.removeEventListener('visibilitychange',resume.onVisibilityChange);
   resume.dispose();if(resumeRef.current===resume)resumeRef.current=null;library.dispose();
  };
 },[library]);
 useEffect(()=>{
  if(previousReload.current===reload)return;
  previousReload.current=reload;
  if(document.visibilityState==='visible')void library.refresh();
  else library.markUncertain();
 },[library,reload]);
 useEffect(()=>{
  if(!open)return;
  if(document.visibilityState==='visible')void library.revalidate({onlyIfNeeded:true,retainKnown:true});
  else library.markUncertain();
 },[library,open]);
 return {...state,beginMutation:library.beginMutation,finishMutation:(token:number,uncertain=false)=>library.finishMutation(token,resumeRef.current?.isResumed()===true,uncertain),setWatch:library.update,refresh:library.refresh,isCurrent:library.isCurrent,isIdentityCurrent:library.isIdentityCurrent};
}
