import handler from "vinext/server/fetch-handler";
/** Standalone demo: no Sites auth, connector capability, or database binding. */
export default { fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) { return handler.fetch(request, env, ctx); } };
