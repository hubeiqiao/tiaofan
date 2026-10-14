import type {Anime} from './types';
import type {EnglishRecord} from './localized-content';
import type {Spotlight} from './spotlight';
import type {Meta} from './anime-display';
export type HomeSeed={year:number;quarter:number;at:string;items:Anime[];discovery?:Anime[];identityMeta:Record<string,Meta>;english:Record<string,EnglishRecord>;spotlights:Spotlight[]};
