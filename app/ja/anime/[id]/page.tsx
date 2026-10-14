import {notFound} from 'next/navigation';
import {documentAnime,animeMetadata,AnimeDocument} from '@/lib/public-documents';
type Props={params:Promise<{id:string}>};
async function resolve(p:Props['params']){const{id}=await p;return /^\d+$/.test(id)&&Number.isSafeInteger(Number(id))?documentAnime(Number(id),'ja'):null}
export async function generateMetadata({params}:Props){const a=await resolve(params);return a?animeMetadata(a,'ja'):{title:'作品が見つかりません｜ティアオファン',robots:{index:false,follow:false}}}
export default async function Page({params}:Props){const a=await resolve(params);if(!a)notFound();return <AnimeDocument a={a} lang="ja"/>}
