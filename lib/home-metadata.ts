import seasonal from '@/data/seasonal-metadata.json';
import {metadataResponse} from './metadata-response';
const covered=new Set(seasonal.coveredIds);
// The generated set includes intentionally unmapped public catalogue IDs.
// Newer D1 rows outside that set still receive the complete original metadata.
export async function homeMetadata(ids:string[]){
 const metadata=ids.every(id=>covered.has(id))?seasonal.metadata:(await import('@/data/metadata-runtime')).default;
 return metadataResponse(new Request('https://seed.invalid/api/metadata?ids='+ids.join(',')),metadata);
}
