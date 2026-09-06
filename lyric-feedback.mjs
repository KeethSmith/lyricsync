import {REPORT_RELAY_URL} from './config.js?v=report-1';
const storageKey='lyricsync.rejected.v1';
export function rejectedVersions(spotifyId,storage=localStorage){
  try{const data=JSON.parse(storage.getItem(storageKey)||'{}');const ids=data[spotifyId];return Array.isArray(ids)?ids.filter(Number.isSafeInteger):[];}catch{return [];}
}
export function saveRejection(spotifyId,lrclibId,storage=localStorage){
  if(!spotifyId||!Number.isSafeInteger(lrclibId))throw Error('No lyric version selected.');
  let data;try{data=JSON.parse(storage.getItem(storageKey)||'{}');}catch{data={};}
  if(!data||typeof data!=='object'||Array.isArray(data))data={};
  data[spotifyId]=[...new Set([...rejectedVersions(spotifyId,storage),lrclibId])];
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
