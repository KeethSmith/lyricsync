import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('sends only Japanese runs to the analyzer in mixed Korean and Japanese lyrics',async()=>{
  const analyzed=[];
  class Worker{
    postMessage({id,text}){analyzed.push(text);queueMicrotask(()=>this.onmessage({data:{id,text:`<${text}>`}}));}
    terminate(){}
  }
  const context={globalThis:null,Worker,setTimeout,clearTimeout,queueMicrotask};
  context.globalThis=context;
  vm.runInNewContext(await readFile(new URL('./japanese-romanization.js',import.meta.url),'utf8'),context);
  const result=await context.JapaneseRomanization.romanizeJapanese('사랑해 ずっと 함께해');
  assert.equal(result,'사랑해 <ずっと> 함께해');
  assert.deepEqual(analyzed,['ずっと']);
});
