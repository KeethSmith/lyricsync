import test from 'node:test';
import assert from 'node:assert/strict';
import {rejectedVersions,rejectedLyrics,saveRejection,resetRejections,flagLyrics} from './lyric-feedback.mjs';
import {lookupLyrics} from './lyric-lookup.mjs';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};};
test('rejections persist, deduplicate, and reset for only one Spotify song',()=>{
  const store=storage();saveRejection('song-a',123,store);saveRejection('song-a',123,store);saveRejection('song-b',456,store);
  assert.deepEqual(rejectedVersions('song-a',store),[123]);resetRejections('song-a',store);
  assert.deepEqual(rejectedVersions('song-a',store),[]);assert.deepEqual(rejectedVersions('song-b',store),[456]);
});
test('rejection remembers normalized lyric content while reading legacy id arrays',()=>{
  const store=storage();store.setItem('lyricsync.rejected.v1',JSON.stringify({legacy:[7]}));
  assert.deepEqual(rejectedVersions('legacy',store),[7]);
  saveRejection('song',{id:8,plainLyrics:"Hello, world!\nWe're here."},store);
  assert.deepEqual(rejectedLyrics('song',store),['hello world we re here']);
});
test('flag uses selected LRCLIB id, fresh proof token, exact report body and one POST',async()=>{
  const calls=[];
  await flagLyrics(123,{relay:'https://relay.example',solve:async challenge=>{assert.equal(challenge.prefix,'test');return 'test:solved';},request:async(url,options)=>{
    calls.push({url,options});return {ok:true,json:async()=>({prefix:'test',target:'f'.repeat(64)})};
  }});
  assert.equal(calls.length,2);assert.equal(calls[0].url,'https://relay.example/api/request-challenge');
  assert.equal(calls[1].url,'https://relay.example/api/flag');assert.equal(calls[1].options.method,'POST');
  assert.equal(calls[1].options.headers['X-Publish-Token'],'test:solved');
  assert.deepEqual(JSON.parse(calls[1].options.body),{trackId:123,content:"The lyrics don't match the audio"});
});
test('failed flag is surfaced and never automatically retried',async()=>{
  let calls=0;
  await assert.rejects(flagLyrics(123,{solve:async()=>'test:solved',request:async()=>++calls===1?{ok:true,json:async()=>({})}:{ok:false,status:429}}),/429/);
  assert.equal(calls,2);
});
test('instrumental report sends its distinct fixed reason',async()=>{
  const calls=[];
  await flagLyrics(321,{content:'The track is not instrumental',relay:'https://relay.example',solve:async()=>'test:solved',request:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({})};}});
  assert.deepEqual(JSON.parse(calls[1].options.body),{trackId:321,content:'The track is not instrumental'});
});
test('excluded exact and search versions never return; exhaustion returns null',async()=>{
  const item={name:'Song',artists:[{name:'Artist'}],album:{name:'Album'},duration_ms:60000};
  const exact={id:1,trackName:'Song',artistName:'Artist',albumName:'Album',duration:60,syncedLyrics:'[00:01]One\n[00:02]Two'};
  const other={...exact,id:2};
  const request=async url=>({ok:true,json:async()=>url.includes('/search?')?[exact,other]:exact});
  assert.equal((await lookupLyrics(item,request,[1])).id,2);
  assert.equal(await lookupLyrics(item,request,[1,2]),null);
});
test('replacement cannot reuse rejected words under a different LRCLIB id or timing',async()=>{
  const item={name:'Song',artists:[{name:'Artist'}],album:{name:'Album'},duration_ms:60000};
  const bad={id:1,trackName:'Song',artistName:'Artist',albumName:'Album',duration:60,plainLyrics:'Wrong word here',syncedLyrics:'[00:01]Wrong word\n[00:02]here'};
  const duplicate={...bad,id:2,syncedLyrics:'[00:01.50]Wrong word\n[00:02.50]here'};
  const good={...bad,id:3,plainLyrics:'Right word here',syncedLyrics:'[00:01]Right word\n[00:02]here'};
  const request=async url=>({ok:true,json:async()=>url.includes('/get?')?duplicate:[duplicate,good]});
  assert.equal((await lookupLyrics(item,request,[1],['wrong word here'])).id,3);
});
