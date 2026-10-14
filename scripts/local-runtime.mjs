import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// Only local dev/build settings. No cloud credentials, login or deployment.
const root=fileURLToPath(new URL('../',import.meta.url));
const runtime=path.join(root,'.wrangler');
process.env.XDG_CONFIG_HOME=path.join(runtime,'config');
process.env.CLOUDFLARE_CF_FETCH_ENABLED='false';
process.env.WRANGLER_SEND_METRICS='false';
process.env.WRANGLER_WRITE_LOGS='false';
process.env.WRANGLER_LOG_PATH=path.join(runtime,'logs');
process.env.WRANGLER_REGISTRY_PATH=path.join(runtime,'dev-registry');
process.env.MINIFLARE_REGISTRY_PATH=path.join(runtime,'registry');
for(const name of ['config','logs','dev-registry','registry'])mkdirSync(path.join(runtime,name),{recursive:true});
