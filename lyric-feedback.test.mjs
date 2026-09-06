import test from 'node:test';
import assert from 'node:assert/strict';
import {rejectedVersions,saveRejection,resetRejections,flagLyrics} from './lyric-feedback.mjs';
import {lookupLyrics} from './lyric-lookup.mjs';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};};
test('rejections persist, deduplicate, and reset for only one Spotify song',()=>{
  const store=storage();saveRejection('song-a',123,store);saveRejection('song-a',123,store);saveRejection('song-b',456,store);
  assert.deepEqual(rejectedVersions('song-a',store),[123]);resetRejections('song-a',store);
  assert.deepEqual(rejectedVersions('song-a',store),[]);assert.deepEqual(rejectedVersions('song-b',store),[456]);
});
test('flag uses selected LRCLIB id, fresh proof token, exact report body and one POST',async()=>{
  const calls=[];
  await flagLyrics(123,{solve:async challenge=>{assert.equal(challenge.prefix,'test');return 'test:solved';},request:async(url,options)=>{
    calls.push({url,options});return {ok:true,json:async()=>({prefix:'test',target:'f'.repeat(64)})};
  }});
  assert.equal(calls.length,2);assert.equal(calls[0].url,'https://lrclib.net/api/request-challenge');
  assert.equal(calls[1].url,'https://lrclib.net/api/flag');assert.equal(calls[1].options.method,'POST');
  assert.equal(calls[1].options.headers['X-Publish-Token'],'test:solved');
  assert.deepEqual(JSON.parse(calls[1].options.body),{trackId:123,content:"The lyrics don't match the audio"});
});
test('failed flag is surfaced and never automatically retried',async()=>{
  let calls=0;
  await assert.rejects(flagLyrics(123,{solve:async()=>'test:solved',request:async()=>++calls===1?{ok:true,json:async()=>({})}:{ok:false,status:429}}),/429/);
  assert.equal(calls,2);
});
test('excluded exact and search versions never return; exhaustion returns null',async()=>{
  const item={name:'Song',artists:[{name:'Artist'}],album:{name:'Album'},duration_ms:60000};
  const exact={id:1,trackName:'Song',artistName:'Artist',albumName:'Album',duration:60,syncedLyrics:'[00:01]One\n[00:02]Two'};
  const other={...exact,id:2};
  const request=async url=>({ok:true,json:async()=>url.includes('/search?')?[exact,other]:exact});
  assert.equal((await lookupLyrics(item,request,[1])).id,2);
  assert.equal(await lookupLyrics(item,request,[1,2]),null);
});
