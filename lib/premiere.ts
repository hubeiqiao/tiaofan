export function premiereLabel(value:string,today=new Date().toISOString().slice(0,10),format='TV'){
 const date=(value||'').trim(),year=today.slice(0,4),movie=['movie','剧场版','电影'].includes(format.toLowerCase());let m=date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(m){const d=new Date(date+'T00:00:00Z');if(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===date)return `${movie?'来源上映日期：':date>today?'预计':''}${m[1]===year?'':m[1]+'年'}${Number(m[2])}月${Number(m[3])}日${movie?'':date>today?'开播':'首播'}`;}
 m=date.match(/^(\d{4})-(\d{2})$/);if(m&&Number(m[2])>=1&&Number(m[2])<=12)return `${date<today.slice(0,7)?(movie?'来源上映年月：':'来源首播年月：'):'预计'}${m[1]===year?'':m[1]+'年'}${Number(m[2])}月${date<today.slice(0,7)?'':' · 日期未定'}`;
 m=date.match(/^(\d{4})-Q([1-4])$/i);if(m){const month=(Number(m[2])-1)*3+1;return `预计${m[1]===year?'':m[1]+'年'}${month}–${month+2}月开播`;}
 return movie?'上映日期待核实':'开播日期未定';
}
