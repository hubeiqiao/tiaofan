/** Preserve worker count/order and the first failure, but drain every worker before
 * returning. Maintenance must not release its source budget while siblings run. */
export async function settledParallelMap<T,R>(items:T[],count:number,fn:(item:T)=>Promise<R>):Promise<R[]> {
  const output:R[] = new Array(items.length);
  let cursor = 0, failed = false, firstError:unknown;
  const workers = Array.from({length:Math.min(count,items.length)},async()=>{
    try {
      while (cursor < items.length) {
        const index = cursor++;
        output[index] = await fn(items[index]);
      }
    } catch (error) {
      if (!failed) { failed=true;firstError=error; }
      // This worker stops. Existing siblings finish their original cursor work;
      // no replacement worker, retry, source or concurrent slot is added.
    }
  });
  await Promise.all(workers);
  if (failed) throw firstError;
  return output;
}
