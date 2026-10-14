'use client';
import {Settings2,Check,Sun,Moon,Monitor,Languages} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {useLocale} from '@/lib/i18n';
import {useTheme} from '@/components/theme-controls';

/** Touch-first, explicit settings. Uses existing accessible Radix primitives. */
export function MobileSettings(){
 const {locale,setLocale}=useLocale();const {choice,setChoice}=useTheme();
 const labels={zh:{settings:'显示设置',language:'语言',appearance:'外观'},en:{settings:'Display settings',language:'Language',appearance:'Appearance'},ja:{settings:'表示設定',language:'言語',appearance:'外観'}}[locale];
 return <Popover><PopoverTrigger asChild><button type="button" className="mobile-settings-trigger" aria-label={labels.settings}><Settings2 size={20}/></button></PopoverTrigger><PopoverContent className="mobile-settings-panel" align="end" sideOffset={10} collisionPadding={16}>
 <h2>{labels.settings}</h2>
 <fieldset><legend><Languages size={15}/>{labels.language}</legend><div className="settings-options" style={{flexWrap:'wrap'}}>{([{value:'zh',label:'中文',lang:'zh-CN'},{value:'en',label:'English',lang:'en'},{value:'ja',label:'日本語',lang:'ja'}] as const).map(({value,label,lang})=><button type="button" key={value} lang={lang} aria-pressed={locale===value} onClick={()=>setLocale(value)} style={{minWidth:0,padding:'8px 4px',whiteSpace:'nowrap'}}>{label}</button>)}</div></fieldset>
 <fieldset><legend>{labels.appearance}</legend><div className="settings-options" style={{flexWrap:'wrap'}}>{([{value:'light',Icon:Sun,zh:'浅色',en:'Light',ja:'ライト'},{value:'dark',Icon:Moon,zh:'深色',en:'Dark',ja:'ダーク'},{value:'system',Icon:Monitor,zh:'系统',en:'Auto',ja:'自動'}] as const).map(({value,Icon,...names})=><button type="button" key={value} aria-pressed={choice===value} onClick={()=>setChoice(value)} style={{minWidth:0,padding:'8px 4px',whiteSpace:'nowrap'}}><Icon size={16} aria-hidden="true"/>{names[locale]}</button>)}</div></fieldset>
 </PopoverContent></Popover>;
}
