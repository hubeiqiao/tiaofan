'use client';
import {useEffect,useRef} from 'react';
import {createReaderHistory} from '@/lib/reader-history';
export function useReaderHistory(open:boolean,close:()=>void,dismissChild:()=>boolean){
 const current=useRef({close,dismissChild});current.current={close,dismissChild};
 const owner=useRef<ReturnType<typeof createReaderHistory>|null>(null);
 useEffect(()=>{const controller=createReaderHistory({history:window.history,token:crypto.randomUUID(),close:()=>current.current.close(),dismissChild:()=>current.current.dismissChild()});owner.current=controller;const pop=()=>controller.pop();window.addEventListener('popstate',pop);controller.sync(open);return()=>{window.removeEventListener('popstate',pop);controller.dispose();owner.current=null}},[]);
 useEffect(()=>owner.current?.sync(open),[open]);
}
