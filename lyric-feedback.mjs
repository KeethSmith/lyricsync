import {REPORT_RELAY_URL} from './config.js?v=report-2';
import {lyricFingerprint} from './lyric-content.mjs';
const storageKey='lyricsync.rejected.v1';
const storedRecord=(spotifyId,storage)=>{
  try{
    const value=JSON.parse(storage.getItem(storageKey)||'{}')[spotifyId];
    if(Array.isArray(value))return {ids:value.filter(Number.isSafeInteger),lyrics:[]};
    return {ids:Array.isArray(value?.ids)?value.ids.filter(Number.isSafeInteger):[],lyrics:Array.isArray(value?.lyrics)?value.lyrics.filter(text=>typeof text==='string'&&text):[]};
  }catch{return {ids:[],lyrics:[]};}
};
export function rejectedVersions(spotifyId,storage=localStorage){
  return storedRecord(spotifyId,storage).ids;
}
export function rejectedLyrics(spotifyId,storage=localStorage){
  return storedRecord(spotifyId,storage).lyrics;
}
export function saveRejection(spotifyId,entry,storage=localStorage){
  const lrclibId=typeof entry==='number'?entry:entry?.id;
  if(!spotifyId||!Number.isSafeInteger(lrclibId))throw Error('No lyric version selected.');
  let data;try{data=JSON.parse(storage.getItem(storageKey)||'{}');}catch{data={};}
  if(!data||typeof data!=='object'||Array.isArray(data))data={};
  const previous=storedRecord(spotifyId,storage),fingerprint=lyricFingerprint(entry);
  data[spotifyId]={ids:[...new Set([...previous.ids,lrclibId])],lyrics:[...new Set([...previous.lyrics,...(fingerprint?[fingerprint]:[])])]};
  storage.setItem(storageKey,JSON.stringify(data));
}
export function resetRejections(spotifyId,storage=localStorage){
  let data;try{data=JSON.parse(storage.getItem(storageKey)||'{}');}catch{data={};}
  if(!data||typeof data!=='object'||Array.isArray(data))data={};
  delete data[spotifyId];storage.setItem(storageKey,JSON.stringify(data));
}
export function solveChallenge(challenge){
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./flag-worker.js',import.meta.url));
    const timeout=setTimeout(()=>finish(Error('LRCLIB report verification timed out.')),125000);
    function finish(error,token){clearTimeout(timeout);worker.terminate();error?reject(error):resolve(token);}
    worker.onmessage=({data})=>data.token?finish(null,data.token):finish(Error(data.error||'Verification failed.'));
    worker.onerror=()=>finish(Error('Could not verify the LRCLIB report.'));
    worker.postMessage(challenge);
  });
}
export async function flagLyrics(trackId,{request=fetch,solve=solveChallenge,relay=REPORT_RELAY_URL}={}){
  if(!Number.isSafeInteger(trackId)||trackId<=0)throw Error('No LRCLIB entry to report.');
  if(!relay&&request===fetch)throw Error('Reporting needs the site report relay configured; LRCLIB blocks direct browser flag requests.');
  const origin=relay?relay.replace(/\/$/,''):'https://lrclib.net';
  const challenge=await request(origin+'/api/request-challenge',{method:'POST',signal:AbortSignal.timeout(15000)});
  if(!challenge.ok)throw Error('LRCLIB could not prepare the report.');
  const publishToken=await solve(await challenge.json());
  // A publish token is single-use; never retry an uncertain POST automatically.
  const response=await request(origin+'/api/flag',{
    method:'POST',headers:{'Content-Type':'application/json','X-Publish-Token':publishToken},
    body:JSON.stringify({trackId,content:"The lyrics don't match the audio"}),signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw Error(`LRCLIB did not accept the report (HTTP ${response.status}).`);
}
