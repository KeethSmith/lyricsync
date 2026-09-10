import test from 'node:test';
import assert from 'node:assert/strict';
import {containsKorean,romanizeKorean} from './korean-romanization.mjs';

test('romanizes Hangul while retaining spacing and punctuation',()=>{
  assert.equal(romanizeKorean('사랑해!'),'saranghae!');
  assert.equal(romanizeKorean('나는 너를 사랑해'),'naneun neoreul saranghae');
});

test('leaves non-Korean lyric text unchanged',()=>{
  assert.equal(containsKorean('안녕'),true);
  assert.equal(containsKorean('Hello'),false);
  assert.equal(romanizeKorean('Hello 123'),'Hello 123');
});
