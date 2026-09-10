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
  const result=await lookupLyrics(item,async url=>({ok:true,json:async()=>++calls===1?{plainLyrics:'First\nSecond'}:url.includes('q=')?[]:[timed]}));
  assert.equal(result,timed);assert.equal(calls,3);
});
test('rejected exact version falls back to full Spotify artist credit despite bad LRCLIB album metadata',async()=>{
  const song={name:"Wouldn't You Like",artists:[{name:'Jorge Rivera-Herrans'},{name:'TROY'},{name:'Cast of EPIC: The Musical'}],album:{name:'EPIC: The Circe Saga (Official Concept Album)'},duration_ms:174000};
  const bad={id:25947506,trackName:song.name,artistName:'Jorge Rivera-Herrans & TROY & Cast of EPIC: The Musical',albumName:'Epic the Musical All Songs in Order Cegli Songs 1',duration:174.106122,syncedLyrics:'[00:01]First\n[00:04]Second'};
  const adjacentBad={...bad,id:9187430,artistName:'Jorge Rivera-Herrans',albumName:song.album.name,duration:174.04};
  const good={...bad,id:15179686,artistName:'Jorge Rivera-Herrans, TROY, & Cast of EPIC: The Musical',albumName:'Jorge Rivera-Herrans',duration:174};
  const result=await lookupLyrics(song,async url=>({ok:true,json:async()=>url.includes('/get?')?adjacentBad:url.includes('q=')?[good,bad]:[]}),[bad.id]);
  assert.equal(result.id,good.id);
});
test('search failure preserves plain lyrics',async()=>{
  let calls=0;const plain={plainLyrics:'Untimed words'};
  assert.equal(await lookupLyrics(item,async()=>{if(calls++)throw Error('Offline');return {ok:true,json:async()=>plain};}),plain);
});
test('uses Japanese lyrics for ATEEZ Still Here on Into the A to Z despite mislabeled LRCLIB records',async()=>{
  const song={name:'Still Here',artists:[{name:'ATEEZ'}],album:{name:'Into the A to Z'},duration_ms:195000};
  const wrong={id:1,trackName:'Still Here',artistName:'ATEEZ',albumName:'Into the A to Z',duration:195,plainLyrics:'아직 여기 있어',syncedLyrics:'[00:01]아직\n[00:04]여기 있어'};
  const right={id:2,trackName:'Still Here (Korean Ver.)',artistName:'ATEEZ',albumName:'ZERO : FEVER Epilogue',duration:195,plainLyrics:'まだここにいる',syncedLyrics:'[00:01]まだ\n[00:04]ここにいる'};
  const result=await lookupLyrics(song,async url=>({ok:true,json:async()=>url.includes('/get?')?wrong:[wrong,right]}));
  assert.equal(result,right);
});
test('keeps the Korean version of ATEEZ Still Here on Korean lyrics',async()=>{
  const song={name:'Still Here (Korean Version)',artists:[{name:'ATEEZ'}],album:{name:'ZERO : FEVER EPILOGUE'},duration_ms:195000};
  const wrong={id:1,trackName:song.name,artistName:'ATEEZ',albumName:song.album.name,duration:195,syncedLyrics:'[00:01]まだ\n[00:04]ここにいる'};
  const right={id:2,trackName:'Still Here',artistName:'ATEEZ',albumName:'Into the A to Z',duration:195,syncedLyrics:'[00:01]아직\n[00:04]여기 있어'};
  const result=await lookupLyrics(song,async url=>({ok:true,json:async()=>url.includes('/get?')?wrong:[wrong,right]}));
  assert.equal(result,right);
});
