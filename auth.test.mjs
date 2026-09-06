import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

function app(clientId='') {
  const elements=new Map(), storage=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:'',hidden:false,focus(){},addEventListener(event,fn){this[event]=fn;}});
    return elements.get(id);
  };
  const store={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  let destination;
  const context={SPOTIFY_CLIENT_ID:clientId,document:{getElementById:element,addEventListener(){},querySelectorAll(){return []},documentElement:{dataset:{}}},localStorage:store,sessionStorage:store,location:{origin:'https://keethsmith.github.io',pathname:'/lyricsync/',search:'',assign:url=>destination=url},URLSearchParams,crypto:webcrypto,TextEncoder,Uint8Array,btoa,performance,setInterval(){}};
  vm.runInNewContext(readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),context);
  return {element,storage,destination:()=>destination};
}
test('sign-in routes to official Spotify authorization with PKCE and registered callback',async()=>{
  const client='a'.repeat(32), instance=app(client);
  await instance.element('connectForm').submit({preventDefault(){}});
  const url=new URL(instance.destination()), params=url.searchParams;
  assert.equal(url.origin,'https://accounts.spotify.com');
  assert.equal(url.pathname,'/authorize');
  assert.equal(params.get('client_id'),client);
  assert.equal(params.get('redirect_uri'),'https://keethsmith.github.io/lyricsync/');
  assert.equal(params.get('response_type'),'code');
  assert.equal(params.get('code_challenge_method'),'S256');
  assert.equal(params.get('scope'),'user-read-currently-playing user-read-playback-state user-modify-playback-state');
  const auth=JSON.parse(instance.storage.get('lyricsync.auth'));
  assert.equal(params.get('state'),auth.state);
  const digest=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(auth.verifier));
  assert.equal(params.get('code_challenge'),Buffer.from(digest).toString('base64url'));
  assert.equal(params.has('client_secret'),false);
});
test('missing app configuration gives a clear message without a broken redirect',async()=>{
  const instance=app();
  await instance.element('connectForm').submit({preventDefault(){}});
  assert.equal(instance.destination(),undefined);
  assert.match(instance.element('status').textContent,/not configured/);
});
