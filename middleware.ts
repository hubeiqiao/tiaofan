import {NextResponse,type NextRequest} from 'next/server';
import {languageCookie,languageEntryTarget} from '@/lib/language-preference';
import {routeLocale} from '@/lib/site-brand';
// Presentation only: derive language from the route, never from caller-supplied identity.
export function middleware(request:NextRequest){
 const url=new URL(request.url);
 if(url.pathname==='/'){const selected=languageCookie(request.headers.get('cookie'));const response=selected?NextResponse.redirect(new URL(languageEntryTarget(selected,url.search),url.origin),307):NextResponse.next();response.headers.set('Cache-Control','private, no-store');response.headers.set('Vary','Cookie, Accept-Language');return response}
 const headers=new Headers(request.headers);
 headers.set('x-tiaofan-locale',routeLocale(new URL(request.url).pathname));
 return NextResponse.next({request:{headers}});
}
export const config={matcher:['/','/zh','/ai','/en/:path*','/ja/:path*','/anime/:path*','/season/:path*']};
