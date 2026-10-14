const usable=(value:unknown)=>typeof value==='string'&&value.trim()&&!/^(?:暂无中文名|中文名待补充|名称待补充)(?:\s|·|$)/.test(value.trim())?value.trim():'';
export function displayTitle(preferred:unknown,original?:unknown,aliases:unknown[]=[],id?:string|number){return usable(preferred)||usable(original)||aliases.map(usable).find(Boolean)||(id?'名称未收录 · '+id:'名称未收录');}
