/** No third-party evidence is bundled. Optional records must be provided and
 * verified by an operator; the default public demo has no conflict receipts. */
export function publicAiringConflict(row,now,records=[]){return records.find(proof=>row?.bgm===proof.bgm&&row.key===`bgm:${proof.bgm}`&&row.end===proof.disputedEnd&&now>=Date.parse(proof.observedAt))||null;}
