import {notFound} from 'next/navigation';
import {SEASONS} from '@/lib/public-content';
import {seasonDocument,seasonMetadata,SeasonDocument} from '@/lib/public-documents';
type Props={params:Promise<{year:string;season:string}>};
async function resolve(p:Props['params']){const x=await p,year=Number(x.year),q=SEASONS.indexOf(x.season as any);return Number.isInteger(year)&&year>=1970&&year<=2100&&q>=0?seasonDocument(year,q,'en'):null}
export async function generateMetadata({params}:Props){const a=await resolve(params);return a?seasonMetadata(a.year,a.quarter,'en'):{title:'Not found',robots:{index:false,follow:false}}}
export default async function Page({params}:Props){const a=await resolve(params);if(!a)notFound();return <SeasonDocument data={a} lang="en"/>}
