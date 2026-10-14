'use client';

import {useState} from 'react';
import {Popover} from '@heroui/react/popover';
import {Button} from '@heroui/react/button';
import {Info,X} from 'lucide-react';

const copy={
 zh:{title:'排期说明',close:'关闭排期说明',note:'按来源首播排期推算；停播、改档及平台上架时间可能不同。'},
 en:{title:'About the schedule',close:'Close schedule information',note:'Calculated from the source airing schedule; breaks, changes and platform release times may differ.'},
 ja:{title:'放送予定について',close:'放送予定の説明を閉じる',note:'出典の放送予定から算出。休止・変更・配信日時は異なる場合があります。'},
};

/** Uses the same touch, keyboard, Escape and focus-return owner as DisplaySettings. */
export function LibraryScheduleInfo({locale,zone}:{zone?:string;locale:'zh'|'en'|'ja'}){
 const [open,setOpen]=useState(false),labels=copy[locale];
 return <Popover isOpen={open} onOpenChange={setOpen}>
  <Button isIconOnly variant="ghost" className="library-schedule-info-trigger" aria-label={labels.title}><Info size={17} aria-hidden="true"/></Button>
  <Popover.Content placement="bottom start" offset={6} containerPadding={16} className="library-schedule-info-panel">
   <Popover.Dialog aria-label={labels.title}>
    <div className="library-schedule-info-heading"><Popover.Heading>{labels.title}</Popover.Heading><Button isIconOnly variant="ghost" className="library-schedule-info-close" aria-label={labels.close} onPress={()=>setOpen(false)}><X size={18} aria-hidden="true"/></Button></div>
    <p>{labels.note}</p>{zone&&<p className="library-schedule-zone">{locale==='ja'?'表示タイムゾーン：':locale==='en'?'Schedule timezone: ':'排期时区：'}{zone}</p>}
   </Popover.Dialog>
  </Popover.Content>
 </Popover>;
}
