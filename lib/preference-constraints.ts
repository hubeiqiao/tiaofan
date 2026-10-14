/** Map explicit natural-language constraints to canonical source values. */
export function normalizePreferenceConstraints(query:string){
 const english:Record<string,string>={'at least':'至少','at most':'最多','no more than':'不超过','fewer than':'少于','less than':'少于',under:'少于','more than':'超过',over:'超过'};
 const japanese:Record<string,string>={'以内':'不超过','以下':'不超过','まで':'不超过','未満':'少于','より少ない':'少于','以上':'至少','から':'至少','より多い':'超过','を超える':'超过','超':'超过'};
 const genres:Record<string,string>={horror:'恐怖',romance:'恋爱',mecha:'机战',isekai:'异世界',gore:'血腥',combat:'战斗',battle:'战斗',ホラー:'恐怖',恐怖:'恐怖',恋愛:'恋爱',ロマンス:'恋爱',メカ:'机战',ロボット:'机战',異世界:'异世界',グロ:'血腥',グロテスク:'血腥',流血:'血腥',バトル:'战斗',戦闘:'战斗'};
 return query.normalize('NFKC')
  .replace(/(at least|at most|no more than|fewer than|less than|under|more than|over)\s*(\d{1,4})\s*episodes?/gi,(_,op,n)=>`${english[op.toLowerCase()]}${n}集`)
  .replace(/(少なくとも|最低|多くても|最大)\s*(\d{1,4})\s*話/g,(_,op,n)=>`${['少なくとも','最低'].includes(op)?'至少':'最多'}${n}集`)
  .replace(/(\d{1,4})\s*話\s*(以内|以下|未満|以上|より少ない|より多い|を超える|まで|から|超)(?:\s*(?:の作品|のアニメ)?(?:は|を)?\s*(除外|避けたい|避ける|見たくない|観たくない))?/g,(_,n,op,negative)=>`${negative?'不要':''}${japanese[op]}${n}集`)
  .replace(/\b(completed only|finished only)\b/gi,'已完结的').replace(/\b(ongoing only)\b/gi,'连载中')
  .replace(/(?:完結済み|完結済|完結)(?:でなくてもよい|でなくてもいい|していなくてもよい|していなくてもいい|は問わない|かどうかは問わない)/g,'不要求完结')
  .replace(/(?:放送中|配信中|未完結)(?:の作品|のアニメ)?(?:は|を)?(?:なし|無し|除外|避けたい|避ける|見たくない|観たくない)/g,'不要连载中')
  .replace(/(?:完結済み|完結済|完結した|完結)(?:の作品|のアニメ)?(?:は|を)?(?:なし|無し|除外|避けたい|避ける|見たくない|観たくない)/g,'不要已完结')
  .replace(/完結済み|完結済|完結した作品|完結したアニメ|完結のみ/g,'已完结的').replace(/放送中のみ|配信中のみ|未完結のみ|放送中|配信中/g,'连载中')
  .replace(/\b(?:no|exclude|avoid)\s+(horror|romance|mecha|isekai|gore|combat|battle)\b/gi,(_,tag)=>'不要'+genres[tag.toLowerCase()])
  .replace(/(ホラー|恐怖|恋愛|ロマンス|メカ|ロボット|異世界|グロテスク|グロ|流血|バトル|戦闘)(?:系|要素|もの)?\s*(?:は|を|が)?\s*(?:なし|無し|除外|不要|避けたい|避ける|見たくない|観たくない|苦手)/g,(_,tag)=>'不要'+genres[tag]);
}
export function preferenceConstraints(query:string){
 query=normalizePreferenceConstraints(query);
 const matches=Array.from(query.matchAll(/((?:不要|不想看|排除|避免)\s*)?(不超过|最多|少于|小于|低于|至少|超过|多于|大于|不少于)?\s*(\d{1,4})\s*集\s*(以内|以下|以上|起)?/g));
 let maximum:number|null=null,minimum:number|null=null;
 for(const numeric of matches){if(!(numeric[2]||numeric[4]))continue;let comparison=['不超过','最多'].includes(numeric[2])||['以内','以下'].includes(numeric[4])?'le':['少于','小于','低于'].includes(numeric[2])?'lt':['至少','不少于'].includes(numeric[2])||['以上','起'].includes(numeric[4])?'ge':'gt';if(numeric[1])comparison=({le:'gt',lt:'ge',ge:'lt',gt:'le'} as Record<string,string>)[comparison];const n=Number(numeric[3]);if(comparison==='le'||comparison==='lt'){const value=n-(comparison==='lt'?1:0);maximum=maximum===null?value:Math.min(maximum,value)}else{const value=n+(comparison==='gt'?1:0);minimum=minimum===null?value:Math.max(minimum,value)}}
 const unconstrained=/(?:不一定|不要求|无所谓|不限).{0,4}完结/.test(query);
 const negativeOngoing=/(?:不要|不想看|不看|排除|避免)\s*(?:正在更新|连载中|未完结|尚未完结)/.test(query);
 const negativeEnded=/(?:不要|不想看|不看|排除|避免|未)\s*(?:已经|已)?完结|正在更新|连载中|还没完结|尚未完结/.test(query);
 const ended=!unconstrained&&(negativeOngoing||(!negativeEnded&&/已完结|完结的|不要追更|不想追更/.test(query)));
 const excludeEnded=!unconstrained&&!negativeOngoing&&negativeEnded;
 const excluded=Array.from(new Set(Array.from(query.matchAll(/(?:不看|不要|避免|排除|不想看)\s*(战斗|恐怖|血腥|恋爱|机战|异世界)/g)).map(x=>x[1])));
 return{maximum,minimum,ended,excludeEnded,excluded};
}
