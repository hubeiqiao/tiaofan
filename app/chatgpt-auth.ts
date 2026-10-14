/** The public demo has no trusted identity provider. Caller-supplied headers,
 * cookies, bearer strings and user IDs are deliberately ignored. A production
 * operator must implement and review server-verified authentication first. */
export type ChatGPTUser = {userId:string;displayName:string;email:string;fullName:string|null};
export async function getChatGPTUser():Promise<ChatGPTUser|null>{return null;}
export async function requireChatGPTUser(_returnTo:string):Promise<ChatGPTUser>{throw new Error('Authentication is unavailable in the source demo.');}
export function chatGPTSignInPath(_returnTo:string):string{return '/ai';}
export function chatGPTSignOutPath(_returnTo='/'):string{return '/';}
