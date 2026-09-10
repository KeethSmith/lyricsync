import {parseLrc} from './lyrics.mjs';
import {lyricFingerprint} from './lyric-content.mjs';
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const albumKey=value=>normalize(value).replace(/\s+ep$/,'');
const scriptCount=(candidate,script)=>{
  const text=`${candidate.plainLyrics||''}\n${candidate.syncedLyrics||''}`;
  return script==='japanese'?(text.match(/[\u3040-\u30ff]/gu)||[]).length:(text.match(/[\uac00-\ud7a3]/gu)||[]).length;
};
const recordingScript=item=>{
  const title=normalize(item.name),artist=normalize(item.artists?.[0]?.name),album=albumKey(item.album?.name);
  if(artist==='ateez'&&title==='still here'&&album==='into the a to z')return 'japanese';
  if(artist==='ateez'&&/^still here korean(?: version)?$/.test(title))return 'korean';
  return null;
};
const hasExpectedScript=(candidate,script)=>!script||scriptCount(candidate,script)>scriptCount(candidate,script==='japanese'?'korean':'japanese');
export function selectTimedMatch(candidates,item,{requireAlbum=true,requireFullCredit=false}={}){
  const duration=item.duration_ms/1000;
  return candidates.filter(candidate=>{
    if(normalize(candidate.trackName)!==normalize(item.name))return false;
    const credit=normalize(candidate.artistName);
    const artists=item.artists.map(artist=>normalize(artist.name)).filter(Boolean);
    if(requireFullCredit?!artists.every(artist=>credit.includes(artist)):credit!==artists[0])return false;
    if(requireAlbum&&albumKey(candidate.albumName)!==albumKey(item.album?.name))return false;
    if(!Number.isFinite(candidate.duration)||Math.abs(candidate.duration-duration)>2)return false;
    const lines=parseLrc(candidate.syncedLyrics||'');
    return lines.length>1&&new Set(lines.map(line=>line.time)).size>1&&lines.at(-1).time<=(duration+2)*1000;
  }).sort((a,b)=>Math.abs(a.duration-duration)-Math.abs(b.duration-duration))[0]||null;
}
export async function lookupLyrics(item,request=fetch,excluded=[],rejectedTexts=[]){
  const expectedScript=recordingScript(item);
  const allowed=candidate=>!excluded.includes(candidate.id)&&!rejectedTexts.includes(lyricFingerprint(candidate));
  const params=new URLSearchParams({track_name:item.name,artist_name:item.artists[0]?.name||'',album_name:item.album?.name||'',duration:Math.round(item.duration_ms/1000)});
  const response=await request('https://lrclib.net/api/get?'+params,{signal:AbortSignal.timeout(15000)});
  if(!response.ok&&response.status!==404)throw Error('Lyrics are temporarily unavailable. Press Refresh to retry.');
  const found=response.ok?await response.json():null;
  const exact=found&&allowed(found)&&hasExpectedScript(found,expectedScript)?found:null;
  // Once a listener rejects a version, compare the wider result set before accepting
  // another /api/get result; adjacent exact matches often repeat the same bad text.
  if(!excluded.length&&(exact?.instrumental||parseLrc(exact?.syncedLyrics||'').length))return exact;
  // Only search if the exact recording has no usable timing; retain its plain lyrics on failure.
  try{
    const search=new URLSearchParams({track_name:item.name,artist_name:item.artists[0]?.name||''});
    const broad=new URLSearchParams({q:[item.name,...item.artists.map(artist=>artist.name)].join(' ')});
    const [result,broadResult]=await Promise.all([
      request('https://lrclib.net/api/search?'+search,{signal:AbortSignal.timeout(15000)}),
      request('https://lrclib.net/api/search?'+broad,{signal:AbortSignal.timeout(15000)})
    ]);
    const candidates=result.ok?(await result.json()).filter(allowed):[];
    const broadCandidates=broadResult.ok?(await broadResult.json()).filter(allowed):[];
    if(expectedScript){
      const languageMatch=[...candidates,...broadCandidates]
        .filter(candidate=>normalize(candidate.artistName)===normalize(item.artists[0]?.name)&&Math.abs(candidate.duration-item.duration_ms/1000)<=2&&hasExpectedScript(candidate,expectedScript)&&parseLrc(candidate.syncedLyrics||'').length>1)
        .sort((a,b)=>Math.abs(a.duration-item.duration_ms/1000)-Math.abs(b.duration-item.duration_ms/1000))[0];
      if(languageMatch)return languageMatch;
    }
    const plain=candidates.filter(candidate=>normalize(candidate.trackName)===normalize(item.name)&&normalize(candidate.artistName)===normalize(item.artists[0]?.name)&&albumKey(candidate.albumName)===albumKey(item.album?.name)&&Number.isFinite(candidate.duration)&&Math.abs(candidate.duration-item.duration_ms/1000)<=2&&candidate.plainLyrics).sort((a,b)=>Math.abs(a.duration-item.duration_ms/1000)-Math.abs(b.duration-item.duration_ms/1000))[0];
    return selectTimedMatch(broadCandidates,item,{requireAlbum:false,requireFullCredit:true})||selectTimedMatch(candidates,item)||exact||plain||null;
  }catch{return exact;}
}
