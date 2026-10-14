import {LibraryScheduleInfo} from '@/components/library-schedule-info';
import {Fragment,type ReactNode} from 'react';
import type {Anime} from '@/lib/types';
import type {LibraryAiringGroup,IsoWeekday} from '@/lib/library-airing';
type Locale='zh'|'en'|'ja';
export const libraryAiringLabels={zh:{ongoing:'连载排期',completed:'已完结',upcoming:'尚未开播',unknown:'播出状态待确认'},en:{ongoing:'Ongoing schedule',completed:'Completed',upcoming:'Upcoming',unknown:'Status unconfirmed'},ja:{ongoing:'放送スケジュール',completed:'放送終了',upcoming:'放送開始前',unknown:'放送状況は未確認'}};
export function airingDayLabel(day:IsoWeekday|null,locale:Locale){return day===null?(locale==='zh'?'星期待确认':locale==='ja'?'曜日未確認':'Day unconfirmed'):(locale==='zh'?['周一','周二','周三','周四','周五','周六','周日']:locale==='ja'?['月曜日','火曜日','水曜日','木曜日','金曜日','土曜日','日曜日']:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])[day-1]}
export function LibraryAiringSections({groups,weekGroups=groups,selectedDay='all',displayed,locale,zone,onDay,renderCard}:{groups:LibraryAiringGroup<Anime>[];weekGroups?:LibraryAiringGroup<Anime>[];selectedDay?:string;displayed:Anime[];locale:Locale;zone:string;onDay:(day:IsoWeekday|null)=>void;renderCard:(item:Anime,index:number,weekly:boolean)=>ReactNode}){
 const shown=new Map(displayed.map((item,index)=>[item.key,{item,index}]));
 const ongoing=weekGroups.find(g=>g.state==='ongoing');
 const selectedOngoing=groups.find(g=>g.state==='ongoing');
 const renderDays=(group:LibraryAiringGroup<Anime>)=>{
  const weekly=group.state==='ongoing';
  const sections=weekly?group.weekdays:[{weekday:null,items:group.items}];
  return <div className={weekly?'library-week-agenda':'library-lifecycle-cards'}>{sections.map(section=>{
   const entries=section.items.flatMap(row=>{const item=shown.get(row.item.key);return item?[item]:[]});
   return entries.length?<div className={'library-day-group '+(weekly?'library-week-day':'')} data-entry-count={weekly?Math.min(entries.length,2):undefined} key={section.weekday??'all'}>{weekly&&<h3>{airingDayLabel(section.weekday,locale)}</h3>}<div className={weekly?'library-agenda-entries':'poster-grid library-shelf-grid'}>{entries.map(({item,index})=><Fragment key={item.key}>{renderCard(item,index,weekly)}</Fragment>)}</div></div>:null;
  })}</div>;
 };
 return <div className="library-airing-sections">
  {!!ongoing?.items.length&&<section className="library-airing-group" data-airing-state="ongoing"><div className="library-week-navigation"><div><h2>{libraryAiringLabels[locale].ongoing}</h2><LibraryScheduleInfo locale={locale} zone={zone}/><span>{selectedOngoing?.items.length||0}</span></div><nav aria-label={locale==='zh'?'按来源播出星期筛选':locale==='ja'?'放送曜日で絞り込む':'Filter by source airing day'}><button aria-pressed={selectedDay==='all'} onClick={()=>onDay(null)}>{locale==='zh'?'整周':locale==='ja'?'すべて':'All week'}</button>{([1,2,3,4,5,6,7] as IsoWeekday[]).map(weekday=>{const count=ongoing.weekdays.find(g=>g.weekday===weekday)?.items.length||0;return <button key={weekday} aria-pressed={selectedDay===['星期一','星期二','星期三','星期四','星期五','星期六','星期日'][weekday-1]} data-empty={count===0} onClick={()=>onDay(weekday)}>{airingDayLabel(weekday,locale)}<span>{count}</span></button>})}</nav></div>{selectedOngoing&&renderDays(selectedOngoing)}</section>}
  {groups.filter(group=>group.state!=='ongoing').map(group=>{
   if(!group.items.some(row=>shown.has(row.item.key)))return null;
   return <section className="library-airing-group" data-airing-state={group.state} key={group.state}><header><h2>{libraryAiringLabels[locale][group.state]}</h2><span>{group.items.length}</span></header>{renderDays(group)}</section>;
  })}
 </div>;
}
