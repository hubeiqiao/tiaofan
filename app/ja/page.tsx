import Home from '@/components/anime-home';
import {homeSeed} from '@/lib/home-seed';
import {homeMetadata} from '@/lib/site-brand';
export const metadata=homeMetadata('ja',true);
export default async function Page(){return <Home initialLocale="ja" initialSeed={await homeSeed('ja')}/>}
