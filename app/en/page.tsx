import Home from '@/components/anime-home';
import {homeSeed} from '@/lib/home-seed';
import {homeMetadata} from '@/lib/site-brand';
export const metadata=homeMetadata('en',true);
export default async function Page(){return <Home initialLocale="en" initialSeed={await homeSeed('en')}/>}
