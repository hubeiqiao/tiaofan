import {SITE_ORIGIN} from './site-brand';
/** Equality marker only: never an authorization credential or database user selector. */
export async function accountContext(userId:string):Promise<string>{
 const bytes=new TextEncoder().encode(`tiaofan/account-context/v1\n${SITE_ORIGIN}\n${userId}`);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
