import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLrc} from './lyrics.mjs';
import {currentWord} from './word-timing.mjs';
test('line-only lyrics do not invent word timestamps',()=>assert.deepEqual(parseLrc('[00:01]Hello world')[0],{time:1000,text:'Hello world'}));
test('actual word timestamps and backward seeking',()=>{
 const line=parseLrc('[00:01]<00:01>Hello <00:02.50>world<00:04>')[0];
 assert.equal(line.text,'Hello world');
 assert.deepEqual(line.words,[{time:1000,text:'Hello '},{time:2500,text:'world'}]);
 assert.equal(currentWord(line.words,3000),1);assert.equal(currentWord(line.words,1500),0);assert.equal(currentWord(line.words,500),-1);
});
test('offset applies to word timestamps',()=>assert.equal(parseLrc('[offset:500]\n[00:02]<00:02>Hi <00:03>there')[0].words[1].time,2500));
test('incomplete and backward timing fall back to a line',()=>{
 assert.equal(parseLrc('[00:01]Hello <00:02>world')[0].words,undefined);
 assert.equal(parseLrc('[00:01]<00:03>Hello <00:02>world')[0].words,undefined);
});
