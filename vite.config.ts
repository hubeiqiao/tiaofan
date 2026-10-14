import './scripts/local-runtime.mjs';
import vinext from 'vinext';
import {defineConfig} from 'vite';
export default defineConfig(async () => {
 process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
 process.env.WRANGLER_SEND_METRICS ??= 'false';
 process.env.WRANGLER_WRITE_LOGS ??= 'false';
 process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
 process.env.WRANGLER_REGISTRY_PATH ??= '.wrangler/dev-registry';
 process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
 const {cloudflare} = await import('@cloudflare/vite-plugin');
 return {cacheDir:'.vinext/node_modules/.vite',build:{reportCompressedSize:false},server:{host:'127.0.0.1'},plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,config:{name:'tiaofan-source-demo',main:'./build/worker.ts',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat']}})]};
});
