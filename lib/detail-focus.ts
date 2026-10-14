/** Return to the initial durable catalog opener without moving the page. */
export function restoreDetailFocus(opener:HTMLElement|null){
 const focus=(target:HTMLElement|null)=>{
  if(!target?.isConnected||target===document.body||target===document.documentElement||target.closest?.('#anime-detail-panel')||target.hasAttribute?.('disabled'))return false;
  target.focus({preventScroll:true});
  return document.activeElement===target;
 };
 if(focus(opener))return true;
 for(const selector of ['.gallery-search input','.gallery-library-entry'])if(focus(document.querySelector<HTMLElement>(selector)))return true;
 return false;
}
