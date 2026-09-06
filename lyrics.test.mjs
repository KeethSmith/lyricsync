import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLrc,activeLine} from './lyrics.mjs';
test('multiple timestamps and fractional precision are sorted',()=>{assert.deepEqual(parseLrc('[00:12.34][00:03.4]hello\n[01:00.123]world'),[{time:3400,text:'hello'},{time:12340,text:'hello'},{time:60123,text:'world'}]);});
test('lyric offset and instrumental gaps',()=>{assert.deepEqual(parseLrc('[offset:500]\n[00:01.00]\n[ar:Artist]'),[{time:500,text:'♪'}]);});
test('active line handles intro, boundaries and seeking backwards',()=>{const lines=parseLrc('[00:02]a\n[00:04]b');assert.equal(activeLine(lines,0),-1);assert.equal(activeLine(lines,2000),0);assert.equal(activeLine(lines,4000),1);assert.equal(activeLine(lines,3000),0);assert.equal(activeLine([],3000),-1);});
