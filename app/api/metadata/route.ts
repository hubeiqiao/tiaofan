import metadata from '@/data/metadata-runtime';
import {metadataResponse} from '@/lib/metadata-response';
export async function GET(req:Request){return metadataResponse(req,metadata)}
