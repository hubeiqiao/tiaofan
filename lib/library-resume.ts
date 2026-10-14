import type {createLibrarySession} from './library-session';

type Session=Pick<ReturnType<typeof createLibrarySession>,'markUncertain'|'revalidate'>;

/** One verification per away/return cycle, independent of browser event timing. */
export function createLibraryResumeCoordinator(library:Session,isVisible:()=>boolean){
 let away=true,disposed=false;
 function hide(retainKnown=true){
  if(disposed)return;
  away=true;
  library.markUncertain({retainKnown});
 }
 function resume(onlyIfNeeded=false){
  if(disposed)return;
  if(!isVisible()){hide();return}
  // A late focus/pageshow belongs to the same return until another hide occurs.
  // Explicit Retry/Refresh bypass this coordinator and can retry a failed check.
  if(!away)return;
  away=false;
  if(!onlyIfNeeded)library.markUncertain({retainKnown:true});
  void library.revalidate({onlyIfNeeded,retainKnown:true}).catch(()=>{});
 }
 return {
  isResumed(){return !disposed&&!away&&isVisible()},
  start(){if(isVisible())resume(true);else library.markUncertain()},
  onFocus(){resume()},
  onBlur(){hide()},
  onVisibilityChange(){if(isVisible())resume();else hide()},
  onPageShow(event:{persisted:boolean}){if(event.persisted)resume()},
  onPageHide(){hide(false)},
  dispose(){disposed=true},
 };
}
