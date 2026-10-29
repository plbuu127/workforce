import {spawnSync} from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = name => readFile(resolve(root, name), 'utf8');
const intakePage = (await read('public/intake.html'))
  .replace('/* INTAKE_STYLE */', await read('public/intake.css'))
  .replace('/* INTAKE_SCRIPT */', (await read('shared/upload-limits.js')).replaceAll('export const', 'const') + '\n' + (await read('shared/intake-comparison.js')).replaceAll('export function', 'function') + '\n' + (await read('shared/case-updates.js')).replaceAll('export function', 'function').replaceAll('export const', 'const') + '\n' + (await read('shared/preparation.js')).replaceAll('export function', 'function').replaceAll('export const', 'const') + '\n' + await read('public/case-updates.js') + '\n' + (await read('shared/onboarding.js')).replaceAll('export function','function') + '\n' + await read('public/onboarding.js') + '\n' + await read('public/companies.js') + '\n' + await read('public/experience.js') + '\n' + await read('public/intake.js'));
const demoPage=(await read('public/demo.html')).replace('/* STYLE */',await read('public/intake.css')).replace('/* SCRIPT */',await read('public/demo.js'));
const operatorPage=(await read('public/operator.html')).replace('/* STYLE */',await read('public/intake.css'));
for(const [name,html] of [['intake',intakePage],['demo',demoPage],['operator',operatorPage]]){
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:script,encoding:'utf8'});
 if(checked.status!==0)throw new Error(name+' script syntax: '+checked.stderr);
}
const appAssets = {};
for (const name of ['contract-unsigned-realistic.pdf','contract-signed-realistic.pdf','stay-expiring.jpg','stay-current.jpg','company-offer-initial.pdf','company-offer-corrected.pdf','contract-unsigned-realistic-1.jpg','contract-signed-realistic-1.jpg','company-offer-initial-1.jpg','company-offer-corrected-1.jpg']) {
  appAssets['/samples/'+name]={type:name.endsWith('.pdf')?'application/pdf':'image/jpeg',encoding:'base64',body:(await readFile(resolve(root,'test/fixtures/preparation',name))).toString('base64')};
}
for (const name of ['pdf.mjs', 'pdf.worker.mjs']) {
  appAssets['/vendor/' + name] = { type: 'text/javascript; charset=utf-8', encoding: 'utf8', body: await read('node_modules/pdfjs-dist/build/' + name) };
}
for (const name of await readdir(resolve(root, 'node_modules/pdfjs-dist/standard_fonts'))) {
  appAssets['/vendor/fonts/' + name] = { type: 'application/octet-stream', encoding: 'base64', body: (await readFile(resolve(root, 'node_modules/pdfjs-dist/standard_fonts', name))).toString('base64') };
}
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist/server'), { recursive: true });
await mkdir(resolve(root, 'dist/.openai'), { recursive: true });
await writeFile(resolve(root, 'dist/server/index.js'), `const demoPage=${JSON.stringify(demoPage)};\nconst operatorPage=${JSON.stringify(operatorPage)};\nconst intakePage = ${JSON.stringify(intakePage)};\nconst appAssets = ${JSON.stringify(appAssets)};\n${await read('worker/index.js')}`);
for (const name of ['intake-api.js', 'intake-ai.js', 'case-updates.js', 'companies.js', 'verification.js', 'demo.js']) await cp(resolve(root, 'worker', name), resolve(root, 'dist/server', name));
for (const name of ['workforce.js', 'intake-comparison.js', 'preparation.js', 'upload-limits.js']) await cp(resolve(root, 'shared', name), resolve(root, 'dist/server', name));
await cp(resolve(root,'shared/case-updates.js'),resolve(root,'dist/server/case-update-view.js'));
await cp(resolve(root, '.openai/hosting.json'), resolve(root, 'dist/.openai/hosting.json'));
await cp(resolve(root, 'drizzle'), resolve(root, 'dist/.openai/drizzle'), { recursive: true });
console.log('Built independent Workforce Worker, private uploads and database migrations.');
