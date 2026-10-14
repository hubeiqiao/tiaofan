import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInThisContext} from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
/** Compile local source in memory only, so focused tests need neither a build nor a framework server. */
export function loadSourceModule(relativePath, overrides = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    if (extname(filename) === '.json') return JSON.parse(readFileSync(filename, 'utf8'));
    const mod = {exports: {}}; cache.set(filename, mod);
    const require = createRequire(filename);
    const localRequire = specifier => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return require(specifier);
      const base = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : resolve(dirname(filename), specifier);
      const target = [base, base + '.ts', base + '.tsx', base + '.js', base + '.json'].find(existsSync);
      if (!target) throw new Error(`Cannot resolve ${specifier} from ${filename}`);
      return load(target);
    };
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {fileName: filename.endsWith('.mjs')?filename.slice(0,-4)+'.ts':filename, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true}}).outputText;
    runInThisContext(`(function(require,module,exports){${code}\n})`, {filename})(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return load(resolve(root, relativePath));
}
