/** Maintenance-only, body-free observations. They never change source acceptance. */
type JsonKind='object'|'array'|'string'|'number'|'boolean'|'null';
type Agreement='match'|'mismatch'|'missing'|'invalid'|'unexamined';
export type DiscussionDiagnostic={
 event:'discussion_source_shape_v1';requested_bgm_id:number;http_status:number|null;
 content_type_category:'json'|'html'|'text'|'other'|'missing'|'unavailable';
 json_kind:JsonKind|'unparsed';id_agreement:Agreement;type_agreement:Agreement;
 topic_present:boolean|null;topic_kind:JsonKind|'missing'|'unexamined';
 topic_count:number|null;topic_count_capped:boolean;has_error_field:boolean|null;has_code_field:boolean|null;
 code:'OK'|'FETCH_TIMEOUT'|'FETCH_FAILED'|'HTTP_ERROR'|'JSON_PARSE_ERROR'|'BODY_READ_FAILED'|'SUBJECT_NOT_OBJECT'|'TOPIC_MISSING'|'TOPIC_NOT_ARRAY'|'TOPIC_MAP_ERROR'|'OTHER_ERROR';
};
export type DiscussionDiagnosticSink=(event:DiscussionDiagnostic)=>void;
const kind=(value:unknown):JsonKind=>value===null?'null':Array.isArray(value)?'array':typeof value as JsonKind;
function agreement(data:Record<string,unknown>,key:string,expected:number):Agreement{
 if(!Object.hasOwn(data,key))return'missing';const value=data[key];
 return typeof value==='number'&&Number.isSafeInteger(value)&&value>0?(value===expected?'match':'mismatch'):'invalid';
}
function contentType(value:string|null):DiscussionDiagnostic['content_type_category']{
 if(!value)return'missing';const mime=value.split(';',1)[0].trim().toLowerCase();
 return /^application\/(?:[a-z0-9.+-]+\+)?json$/.test(mime)?'json':mime==='text/html'?'html':mime.startsWith('text/')?'text':'other';
}
export async function observeDiscussion<T>(subjectId:number,request:()=>Promise<Response>,map:(topics:any[])=>T,sink?:DiscussionDiagnosticSink):Promise<T>{
 const event:DiscussionDiagnostic={event:'discussion_source_shape_v1',requested_bgm_id:subjectId,http_status:null,content_type_category:'unavailable',json_kind:'unparsed',id_agreement:'unexamined',type_agreement:'unexamined',topic_present:null,topic_kind:'unexamined',topic_count:null,topic_count_capped:false,has_error_field:null,has_code_field:null,code:'OTHER_ERROR'};
 let stage:'fetch'|'json'|'topic'|'map'='fetch';
 try{
  const response=await request();event.http_status=response.status;event.content_type_category=contentType(response.headers.get('content-type'));
  if(!response.ok){event.code='HTTP_ERROR';throw Error(`Bangumi讨论暂未取得（${response.status}）`)}
  stage='json';const data=await response.json() as any;event.json_kind=kind(data);
  if(event.json_kind==='object'){
   event.id_agreement=agreement(data,'id',subjectId);event.type_agreement=agreement(data,'type',2);
   event.has_error_field=Object.hasOwn(data,'error');event.has_code_field=Object.hasOwn(data,'code');
   event.topic_present=Object.hasOwn(data,'topic');event.topic_kind=event.topic_present?kind(data.topic):'missing';
   if(Array.isArray(data.topic)){event.topic_count=Math.min(data.topic.length,1000);event.topic_count_capped=data.topic.length>1000}
  }
  stage='topic';
  // Keep the original null/primitive access and array acceptance behavior.
  if(!Array.isArray(data.topic))throw Error('讨论来源格式不符，保留原快照');
  stage='map';const result=map(data.topic.slice(0,10));event.code='OK';return result;
 }catch(error){
  const timedOut=error instanceof Error&&['AbortError','TimeoutError'].includes(error.name);
  if(event.code!=='HTTP_ERROR')event.code=(stage==='fetch'||stage==='json')&&timedOut?'FETCH_TIMEOUT':stage==='fetch'?'FETCH_FAILED':stage==='json'?(error instanceof SyntaxError?'JSON_PARSE_ERROR':'BODY_READ_FAILED'):stage==='map'?'TOPIC_MAP_ERROR':event.json_kind!=='object'?'SUBJECT_NOT_OBJECT':event.topic_present===false?'TOPIC_MISSING':'TOPIC_NOT_ARRAY';
  throw error;
 }finally{
  // A bad observer cannot change content, original errors or request scheduling.
  if(sink&&Number.isSafeInteger(subjectId)&&subjectId>0)try{sink(event)}catch{}
 }
}
/** Same cursor/worker behavior, but no discussion request survives its result. */
export async function mapDiscussionSubjects<T,R>(xs:T[],fn:(x:T)=>Promise<R>):Promise<R[]>{
 const out:R[]=new Array(xs.length);let cursor=0;
 const workers=Array.from({length:Math.min(2,xs.length)},async()=>{while(cursor<xs.length){const index=cursor++;out[index]=await fn(xs[index]);}});
 try{await Promise.all(workers)}catch(error){await Promise.allSettled(workers);throw error}
 return out;
}
