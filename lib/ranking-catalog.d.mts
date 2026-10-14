export const RANKING_PAGE_SIZE: number;
export function queryRanking(input: {source: string; registry?: any; snapshot?: any}, query?: {offset?: number; limit?: number; top?: number; media?: string; query?: string; minimumVotes?: number; version?: string|null; airing?: string}, now?: number): any;
export function hydrateRankingPage(page: any, loadDetails: (ids: number[])=>Promise<Record<string,any>>): Promise<any>;
