export type AiringConflict={bgm:number;disputedEnd:string;observedAt:string;sourceUrl:string;publishedAt:string;title:string};
export function publicAiringConflict(row:{key:string;bgm?:number;end?:string}|undefined,now:number,records?:AiringConflict[]):null|AiringConflict;
