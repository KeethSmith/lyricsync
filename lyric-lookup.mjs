import {parseLrc} from './lyrics.mjs';
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const albumKey=value=>normalize(value).replace(/\s+ep$/,'');
export function selectTimedMatch(candidates,item){
  const duration=item.duration_ms/1000;
  return candidates.filter(candidate=>{
    if(normalize(candidate.trackName)!==normalize(item.name))return false;
    if(normalize(candidate.artistName)!==normalize(item.artists[0]?.name))return false;
    if(albumKey(candidate.albumName)!==albumKey(item.album?.name))return false;
    if(!Number.isFinite(candidate.duration)||Math.abs(candidate.duration-duration)>2)return false;
    const lines=parseLrc(candidate.syncedLyrics||'');
    return lines.length>1&&new Set(lines.map(line=>line.time)).size>1&&lines.at(-1).time<=(duration+2)*1000;
  }).sort((a,b)=>Math.abs(a.duration-duration)-Math.abs(b.duration-duration))[0]||null;
}
export async function lookupLyrics(item,request=fetch,excluded=[]){
  const params=new URLSearchParams({track_name:item.name,artist_name:item.artists[0]?.name||'',album_name:item.album?.name||'',duration:Math.round(item.duration_ms/1000)});
  const response=await request('https://lrclib.net/api/get?'+params,{signal:AbortSignal.timeout(15000)});
  if(!response.ok&&response.status!==404)throw Error('Lyrics are temporarily unavailable. Press Refresh to retry.');
  const found=response.ok?await response.json():null;
  const exact=found&&!excluded.includes(found.id)?found:null;
  if(exact?.instrumental||parseLrc(exact?.syncedLyrics||'').length)return exact;
  // Only search if the exact recording has no usable timing; retain its plain lyrics on failure.
  try{
    const search=new URLSearchParams({track_name:item.name,artist_name:item.artists[0]?.name||''});
    const result=await request('https://lrclib.net/api/search?'+search,{signal:AbortSignal.timeout(15000)});
    if(!result.ok)return exact;
    const candidates=(await result.json()).filter(candidate=>!excluded.includes(candidate.id));
    const plain=candidates.filter(candidate=>normalize(candidate.trackName)===normalize(item.name)&&normalize(candidate.artistName)===normalize(item.artists[0]?.name)&&albumKey(candidate.albumName)===albumKey(item.album?.name)&&Number.isFinite(candidate.duration)&&Math.abs(candidate.duration-item.duration_ms/1000)<=2&&candidate.plainLyrics).sort((a,b)=>Math.abs(a.duration-item.duration_ms/1000)-Math.abs(b.duration-item.duration_ms/1000))[0];
    return selectTimedMatch(candidates,item)||exact||plain||null;
  }catch{return exact;}
}
