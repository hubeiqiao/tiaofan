'use client';
import {useState} from 'react';
export function CopyAiPrompt({text,label,copied,failure,preview}:{text:string;label:string;copied:string;failure:string;preview:string}){
 const [status,setStatus]=useState('');
 async function copy(){try{await navigator.clipboard.writeText(text);setStatus(copied)}catch{setStatus(failure)}}
 return <div className="ai-prompt"><button className="public-primary" type="button" onClick={copy}>{label}</button><span className="ai-copy-status" role="status" aria-live="polite">{status}</span><details className="system-disclosure"><summary>{preview}</summary><textarea aria-label={preview} value={text} readOnly rows={7} onFocus={event=>event.currentTarget.select()}/></details></div>;
}
