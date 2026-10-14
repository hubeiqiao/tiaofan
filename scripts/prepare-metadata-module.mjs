import {readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {metadataSubset} from './metadata-subset.mjs';
import {metadataLinkProjection} from './metadata-link-projection.mjs';
const raw=readFileSync(new URL('../data/metadata.json',import.meta.url),'utf8');
const metadata=JSON.parse(raw);
writeFileSync(new URL('../data/metadata-provenance.json',import.meta.url),JSON.stringify(metadata.meta)+'\n');
// Keep large public data out of the TypeScript AST; decode synchronously on its server-only import.
const packed = gzipSync(Buffer.from(raw, 'utf8'), {level: 9}).toString('base64');
writeFileSync(new URL('../data/metadata-runtime.ts', import.meta.url),
 '// Generated from metadata.json. Do not edit.\n' +
 "import {Buffer} from 'node:buffer';\nimport {gunzipSync} from 'node:zlib';\n" +
 'const metadata: any = JSON.parse(new TextDecoder().decode(gunzipSync(Buffer.from(' + JSON.stringify(packed) + ",'base64'))));\nexport default metadata;\n");
rmSync(new URL('../data/metadata-runtime.js',import.meta.url),{force:true});
// Rebuilt on every dev/build, including scheduled public snapshot publication.
// This is an exact projection, with no new source fetch or refreshed proof date.
const snapshots=readFileSync(new URL('../data/source-snapshots.json',import.meta.url),'utf8');
writeFileSync(new URL('../data/seasonal-metadata.json',import.meta.url),JSON.stringify(metadataSubset(raw,snapshots))+'\n');
// Keep public series/language evidence aligned with this exact tracked registry.
const {generateRecommendationCatalog}=await import('./prepare-recommendation-catalog.mjs');
generateRecommendationCatalog();

// Historical details parse one selected 100-title link shard, not the full metadata map.
const links=metadataLinkProjection(metadata),entries=Object.entries(links.items),lookup={},loaders=[];
const shardDir=new URL('../data/metadata-link-shards/',import.meta.url);mkdirSync(shardDir,{recursive:true});
for(let i=0;i<entries.length;i+=100){
 const key=String(i/100).padStart(3,'0'),batch=entries.slice(i,i+100);for(const [id]of batch)lookup[id]=key;
 const packed=gzipSync(Buffer.from(JSON.stringify(Object.fromEntries(batch))),{level:9}).toString('base64');
 writeFileSync(new URL(key+'.ts',shardDir),'// Generated exact public link shard.\nexport default '+JSON.stringify(packed)+';\n');
 loaders.push(JSON.stringify(key)+':()=>import("./metadata-link-shards/'+key+'")');
}
writeFileSync(new URL('../data/metadata-links-runtime.ts',import.meta.url),
 '// Generated exact public link lookup. No fetch, ratings, private data or new verification date.\n'+
 "import {Buffer} from 'node:buffer';\nimport {gunzipSync} from 'node:zlib';\n"+
 "import metadataProvenance from './metadata-provenance.json';\nimport {metadataLinksWithProvenance} from '../lib/metadata-link-provenance';\n"+
 'const index:Record<string,string>='+JSON.stringify(lookup)+';\n'+
 'const loaders:Record<string,()=>Promise<{default:string}>>={'+loaders.join(',')+'};\n'+
 'export async function metadataLinksFor(id:number){if(!Number.isSafeInteger(id)||id<1)return null;const load=loaders[index[id]];if(!load)return null;const data=JSON.parse(new TextDecoder().decode(gunzipSync(Buffer.from((await load()).default,"base64"))));return data[id]?metadataLinksWithProvenance(data[id],metadataProvenance):null;}\n');
