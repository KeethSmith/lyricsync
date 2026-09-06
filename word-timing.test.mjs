import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateWords,currentWord} from './word-timing.mjs';
test('words advance across a line, preserving punctuation',()=>{
  const words=estimateWords('Hi, there!',1000,8000);
  assert.deepEqual(words,[{text:'Hi,',time:1000},{text:'there!',time:3000}]);
  assert.equal(currentWord(words,999),-1);
  assert.equal(currentWord(words,1000),0);
  assert.equal(currentWord(words,3000),1);
});
test('seeking backward resets highlighted word',()=>{
  const words=estimateWords('one two six',0,9000);
  assert.equal(currentWord(words,7000),2);
  assert.equal(currentWord(words,1000),0);
});
test('empty, instrumental and Unicode lines remain safe',()=>{
  assert.deepEqual(estimateWords('',0,0),[]);
  assert.deepEqual(estimateWords('♪',0,4000),[{text:'♪',time:0}]);
  assert.equal(estimateWords('안녕 세상',100,2100).length,2);
});
