/** Component-owned memory only. Never persisted, shared across visitors or sent to a model. */
export function createRecommendationSession<T>(){
 let boundary='';const cache=new Map<string,T>(),attempts=new Set<string>();
 return{
  select(next:string){if(next===boundary)return;boundary=next;cache.clear();attempts.clear()},
  read(key:string){return cache.get(key)},
  hasAttempted(key:string){return attempts.has(key)},
  attempt(key:string){attempts.add(key)},
  remember(key:string,value:T){cache.set(key,value);if(cache.size>6)cache.delete(cache.keys().next().value!);attempts.add(key)},
  forgetAttempt(key:string){attempts.delete(key)},
  remove(key:string){cache.delete(key);attempts.delete(key)},
  clear(){boundary='';cache.clear();attempts.clear()},
 };
}
