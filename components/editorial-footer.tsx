'use client';
import {SiteFooter} from '@/components/site-footer';
import type {Locale} from '@/lib/localization';
export type EditorialFooterProps={locale:Locale;formattedTimestamp:string;onInfo:()=>void};
/** The parent retains freshness and source-dialog focus ownership. */
export function EditorialFooter(props:EditorialFooterProps){return <SiteFooter {...props}/>}
