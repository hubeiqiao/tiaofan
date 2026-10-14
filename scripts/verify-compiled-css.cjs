const fs=require('node:fs');const path=require('node:path');const postcss=require('postcss');
function validateSource(css){
 const imports=css.split('\n').filter(line=>/^\s*@(import|source)\b/.test(line));
 if(imports.length<6||imports.some(line=>!line.trimEnd().endsWith(';')))throw Error('Invalid CSS import/source directive: each must end with a semicolon.');
 const root=postcss.parse(css);const found=[];root.walkAtRules('import',r=>{if(r.nodes||r.params.includes('@'))throw Error('Invalid CSS import directive with attached child nodes.');found.push(r.params)});
 for(const name of ['"tailwindcss"','"./heroui.css"','"tw-animate-css"','"../vendor/shadcn-tailwind-4.13.0.css"'])if(!found.includes(name))throw Error('Missing CSS import '+name);
}
function validateCompiled(css){
 const root=postcss.parse(css),rules=new Map();root.walkRules(rule=>{for(const selector of rule.selectors){const own=rules.get(selector)||{};rule.walkDecls(d=>own[d.prop]=d.value);rules.set(selector,own)}});
 const check=(selector,prop,test)=>{const value=rules.get(selector)?.[prop];if(value===undefined||!test(value))throw Error('Missing or invalid compiled utility '+selector+' '+prop)};
 check('.fixed','position',v=>v==='fixed');check('.inset-0','inset',v=>v==='0'||v==='0px'||/^calc\(.*\*\s*0\)$/.test(v));check('.z-50','z-index',v=>v==='50');
 for(const[prop,value]of Object.entries({position:'absolute',width:'1px',height:'1px',overflow:'hidden','white-space':'nowrap'}))check('.sr-only',prop,v=>v===value);
}
module.exports={validateSource,validateCompiled};
if(require.main===module){validateSource(fs.readFileSync('app/globals.css','utf8'));if(!process.argv.includes('--source-only')){const dir='dist/client/_next/static/css',files=fs.readdirSync(dir).filter(f=>/^index\..*\.css$/.test(f));if(files.length!==1)throw Error('Expected exactly one current compiled CSS entry');validateCompiled(fs.readFileSync(path.join(dir,files[0]),'utf8'));console.log('Compiled CSS accessibility and modal utilities verified.')}else console.log('CSS import/source preflight verified.');}
