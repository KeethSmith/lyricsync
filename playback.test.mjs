import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackRequest,sendPlayback} from './playback.mjs';
test('control requests use Spotify methods and bounded millisecond seek',()=>{
  assert.equal(playbackRequest('pause').method,'PUT');
  assert.equal(playbackRequest('next').method,'POST');
  assert.match(playbackRequest('previous').url,/\/previous$/);
  assert.match(playbackRequest('seek',-1).url,/position_ms=0$/);
  assert.match(playbackRequest('seek',1250.6).url,/position_ms=1251$/);
});
test('a command is sent once and empty success responses are accepted',async()=>{
  let calls=0;
  await sendPlayback('play',0,'test-token',async(url,options)=>{calls++;assert.match(url,/\/play$/);assert.equal(options.headers.Authorization,'Bearer test-token');return {ok:true,status:204};});
  assert.equal(calls,1);
});
test('missing devices and restricted accounts are explained',async()=>{
  await assert.rejects(sendPlayback('next',0,'test',async()=>({ok:false,status:404})),/device first/);
  await assert.rejects(sendPlayback('pause',0,'test',async()=>({ok:false,status:403})),/Premium/);
});
