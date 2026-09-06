import test from 'node:test';
import assert from 'node:assert/strict';
import {selectTimedMatch,lookupLyrics} from './lyric-lookup.mjs';
const item={name:'My Goodbye',artists:[{name:'Jorge Rivera-Herrans'}],album:{name:'EPIC: The Cyclops Saga (Official Concept Album)'},duration_ms:197680};
const timed={trackName:item.name,artistName:item.artists[0].name,albumName:item.album.name+' - EP',duration:198,syncedLyrics:'[00:01]First\n[00:04]Second'};
test('finds same recording with album EP suffix and close duration',()=>assert.equal(selectTimedMatch([timed],item),timed));
test('rejects different recording, wrong artist and incorrect duration',()=>{
  for(const change of [{duration:175},{albumName:'EPIC: The Cyclops Saga (Original Concept Album)'},{artistName:'Cover Artist'},{trackName:'Other Song'},{syncedLyrics:'[00:00]First\n[00:00]Second'}])assert.equal(selectTimedMatch([{...timed,...change}],item),null);
});
test('untimed exact entry falls back to timed search result',async()=>{
  let calls=0;
  const result=await lookupLyrics(item,async()=>({ok:true,json:async()=>++calls===1?{plainLyrics:'First\nSecond'}:[timed]}));
  assert.equal(result,timed);assert.equal(calls,2);
});
test('search failure preserves plain lyrics',async()=>{
  let calls=0;const plain={plainLyrics:'Untimed words'};
  assert.equal(await lookupLyrics(item,async()=>{if(calls++)throw Error('Offline');return {ok:true,json:async()=>plain};}),plain);
});
