import {rejectedVersions,rejectedLyrics,saveRejection,resetRejections,flagLyrics} from './lyric-feedback.mjs?v=duplicate-1';
import {currentWord} from './word-timing.mjs?v=actual-1';
import {lookupLyrics} from './lyric-lookup.mjs?v=reject-2';
import {PLAYBACK_SCOPE, sendPlayback} from './playback.mjs';
import {parseLrc,activeLine} from './lyrics.mjs?v=actual-1';
import {SPOTIFY_CLIENT_ID} from './config.js?v=2';
const $=id=>document.getElementById(id), redirect=location.origin+location.pathname.replace(/index\.html$/,'');
const keys={token:'lyricsync.token',auth:'lyricsync.auth'};
let controlBusy=false, displayedLyrics=null, reportBusy=false;
let reportProgressTimer=null;
const reportButton=$('rejectLyrics'),reportButtonHome=reportButton.parentElement;
const lyricsFullscreen=()=>document.fullscreenElement===$('lyricsPanel')||$('lyricsPanel').classList.contains('lyrics-expanded');
const setReportIdleLabel=()=>{reportButton.textContent=lyricsFullscreen()?'Report Lyrics':displayedLyrics?.instrumental?'Is this an error?':'Wrong lyrics — report & try another';};
let token=JSON.parse(sessionStorage.getItem(keys.token)||'null'), track=null, activeDevice=null, lines=[], wordTimings=[], base=0, sampled=0, playing=false, demo=false, selected=-2, generation=0, timer, busy=false, cooldown=0;
const status=text=>$('status').textContent=text;
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
const fmt=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
async function exchange(params){const res=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});if(!res.ok)throw Error('Spotify login expired or could not be completed. Please connect again.');const data=await res.json();token={...data,refresh_token:data.refresh_token||token?.refresh_token,expires:Date.now()+data.expires_in*1000};sessionStorage.setItem(keys.token,JSON.stringify(token));}
$('connectForm').addEventListener('submit',async e=>{e.preventDefault();try{const client=SPOTIFY_CLIENT_ID;if(!/^[a-f\d]{32}$/i.test(client))throw Error('Spotify sign-in is not configured. You can explore the demo in the meantime.');const verifier=random(),state=random();sessionStorage.setItem(keys.auth,JSON.stringify({verifier,state}));const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');location.assign('https://accounts.spotify.com/authorize?'+new URLSearchParams({client_id:client,response_type:'code',redirect_uri:redirect,scope:'user-read-currently-playing user-read-playback-state user-modify-playback-state',code_challenge_method:'S256',code_challenge:challenge,state}));}catch(err){status(err.message);}});
async function spotifyRequest(path){const res=await fetch('https://api.spotify.com/v1'+path,{headers:{Authorization:`Bearer ${token.access_token}`}});if(res.status===204)return null;if(res.status===429){cooldown=Date.now()+Math.max(5,Number(res.headers.get('Retry-After'))||30)*1000;throw Error('Spotify is busy. Waiting before checking again.');}if(res.status===401){token=null;sessionStorage.removeItem(keys.token);$('setup').hidden=false;throw Error('Your Spotify session expired. Connect again.');}if(res.status===403)throw Error('Spotify denied playback access. Sign in again and check that this account is allowed in the Spotify developer app.');if(!res.ok)throw Error('Spotify is temporarily unavailable. We will try again.');return res.json();}
async function spotify(){if(!token)throw Error('Connect Spotify to see your current song.');if(Date.now()>token.expires-30000)await exchange({grant_type:'refresh_token',refresh_token:token.refresh_token,client_id:SPOTIFY_CLIENT_ID});const scopes=(token.scope||'').split(' '),hasPlaybackState=scopes.includes('user-read-playback-state');const playback=await spotifyRequest(hasPlaybackState?'/me/player':'/me/player/currently-playing');if(playback)return playback;if(!hasPlaybackState)throw Error('Sign in again from Settings to enable playback detection for Spotify Connect devices.');const queue=await spotifyRequest('/me/player/queue');if(queue?.currently_playing?.type==='track')return {item:queue.currently_playing,progress_ms:0,is_playing:false,device:null,inferredFromQueue:true};return null;}
function empty(title,body){if(reportButton.parentElement!==reportButtonHome)reportButtonHome.prepend(reportButton);reportButton.classList.remove('instrumental-report');displayedLyrics=null;reportButton.disabled=true;$('wordTimingNote').hidden=true;$('lyrics').replaceChildren();const box=document.createElement('div');box.className='empty';const h=document.createElement('h2'),p=document.createElement('p');h.textContent=title;p.textContent=body;box.append(h,p);$('lyrics').append(box);return box;}
function renderLyrics(){
  selected=-2;
  wordTimings=lines.map(line=>line.words||[]);
  $('wordTimingNote').hidden=!wordTimings.some(words=>words.length);
  $('lyrics').replaceChildren(...lines.map(line=>{
    const p=document.createElement('p');p.className='line';
    if(!line.words){p.textContent=line.text;return p;}
    line.words.forEach(word=>{
      const span=document.createElement('span');span.className='lyric-word';span.textContent=word.text;p.append(span);
    });
    return p;
  }));
}
function highlightWords(index,position){
  const row=$('lyrics').children[index];if(!row)return;
  const active=currentWord(wordTimings[index]||[],position);
  for(let i=0;i<row.children.length;i++){
    row.children[i].classList.toggle('word-sung',i<=active);
    row.children[i].classList.toggle('word-current',i===active);
  }
}
function setTrack(item){track=item;$('title').textContent=item.name;$('artist').textContent=item.artists.map(a=>a.name).join(', ');const art=item.album?.images?.[0]?.url;$('art').hidden=!art;$('artPlaceholder').hidden=!!art;if(art)$('art').src=art;else $('art').removeAttribute('src');const url=item.external_urls?.spotify;$('trackLink').hidden=!url;if(url)$('trackLink').href=url;}
async function getLyrics(item,version){lines=[];empty('Finding the words…','Looking for lyrics for this recording.');try{const data=await lookupLyrics(item,fetch,rejectedVersions(item.id),rejectedLyrics(item.id));if(version!==generation)return;if(!data){empty('No more matching lyrics.','No usable versions remain for this recording. You can reset skipped versions to try them again.');return;}displayedLyrics=data;reportButton.disabled=reportBusy||!Number.isSafeInteger(data.id);setReportIdleLabel();if(data.instrumental){const box=empty('Let the music speak.','This track is marked as instrumental.');displayedLyrics=data;reportButton.disabled=reportBusy||!Number.isSafeInteger(data.id);setReportIdleLabel();reportButton.classList.add('instrumental-report');if(lyricsFullscreen())reportButtonHome.prepend(reportButton);else box.append(reportButton);return;}lines=parseLrc(data.syncedLyrics||'');if(lines.length){$('lyricSource').textContent='SYNCED · LRCLIB';renderLyrics();}else if(data.plainLyrics){$('lyricSource').textContent='UNSYNCED · LRCLIB';$('lyrics').replaceChildren(...data.plainLyrics.split('\n').map(text=>{const p=document.createElement('p');p.className='line';p.textContent=text||' ';return p;}));}else empty('No lyrics available.','LRCLIB has no lyrics for this recording.');}catch(err){if(version===generation)empty('Could not load lyrics.',err.message);}}
async function poll(force=false){clearTimeout(timer);if(busy||controlBusy||demo||!token)return;if(Date.now()<cooldown){timer=setTimeout(()=>poll(),cooldown-Date.now());return;}busy=true;const version=generation;try{const data=await spotify();if(version!==generation||demo)return;activeDevice=data?.device||null;if(!data?.item||data.item.type!=='track'){playing=false;track=null;lines=[];generation++;$('mode').textContent='WAITING FOR SPOTIFY';$('title').textContent='Nothing playing';$('artist').textContent='Start a song in Spotify';$('trackLink').hidden=true;$('art').hidden=true;$('artPlaceholder').hidden=false;empty('Waiting for your music.','Start a song in Spotify on any active device.');status('Spotify reports no active track for this account. Confirm the Tesla and LyricSync are signed into the same Spotify account.');return;}base=data.progress_ms||0;sampled=performance.now();playing=data.is_playing;$('mode').textContent=data.inferredFromQueue?'TRACK DETECTED':playing?'NOW PLAYING':'PAUSED';status(data.inferredFromQueue?'Track found through Spotify’s queue. Live timing will begin when Spotify exposes the Tesla playback state.':activeDevice?.is_restricted?`${activeDevice.name||'This device'} is playing, but Spotify does not allow remote playback controls on it.`:playing?'Connected · Following your Spotify playback':'Connected · Playback paused');if(track?.id!==data.item.id||force){setTrack(data.item);getLyrics(data.item,++generation);}}catch(err){playing=false;status(err.message);}finally{busy=false;if(token&&!demo)timer=setTimeout(()=>poll(),Math.max(5000,cooldown-Date.now()));}}
function reset(){generation++;clearTimeout(timer);token=null;sessionStorage.removeItem(keys.token);demo=false;playing=false;track=null;activeDevice=null;lines=[];base=0;setTrack({name:'Your next favorite moment',artists:[{name:'Start a song in Spotify'}],duration_ms:0});track=null;$('setup').hidden=false;$('mode').textContent='NOW PLAYING';$('lyricSource').textContent='LRCLIB';empty('Every song has a story.','Connect Spotify to follow along.');status('Disconnected.');}
$('settings').onclick=()=>{$('setup').hidden=!$('setup').hidden;if(!$('setup').hidden)$('signIn').focus();};
$('disconnect').onclick=reset;
$('refresh').onclick=()=>{if(demo){sampled=performance.now();base=0;}else if(token)poll(true);else status('Connect Spotify first, or explore the demo.');};
$('offset').oninput=()=>{$('offsetValue').textContent=Number($('offset').value).toFixed(1)+'s';};
$('demo').onclick=()=>{generation++;clearTimeout(timer);demo=true;playing=true;base=0;sampled=performance.now();$('setup').hidden=true;$('mode').textContent='DEMO · NO AUDIO';$('lyricSource').textContent='ORIGINAL DEMO LYRICS';setTrack({id:'demo',name:'Between the Notes',artists:[{name:'LyricSync · visual preview'}],duration_ms:32000});lines=parseLrc('[00:00.00]Let the room fall quiet\n[00:04.00]Watch the colors come alive\n[00:08.00]Every word a little brighter\n[00:12.00]Every moment passing by\n[00:16.00]Somewhere in the spaces\n[00:20.00]Between the notes we know\n[00:24.00]We find a little feeling\n[00:28.00]And let the music flow');renderLyrics();status('Demo preview · Original sample words, no audio. Open Settings to connect Spotify.');};
setInterval(()=>{let pos=track?Math.min(track.duration_ms,base+(playing?performance.now()-sampled:0)):0;if(demo&&pos>=32000){sampled=performance.now();pos=0;}updateControls(pos);if(!lines.length)return;const next=activeLine(lines,pos+Number($('offset').value)*1000);if(next!==selected){selected=next;[...$('lyrics').children].forEach((el,i)=>{el.classList.toggle('active',i===next);el.classList.toggle('past',i<next);if(i===next)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});const el=$('lyrics').children[next];if(el&&$('follow').checked)$('lyrics').scrollTo({top:el.offsetTop-$('lyrics').clientHeight/2+el.clientHeight/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}highlightWords(next,pos+Number($('offset').value)*1000);},100);
async function init(){const params=new URLSearchParams(location.search);if(params.has('code')||params.has('error')){history.replaceState({},'',redirect);try{const auth=JSON.parse(sessionStorage.getItem(keys.auth)||'null');sessionStorage.removeItem(keys.auth);if(params.has('error'))throw Error('Spotify connection was cancelled. You can try again.');if(!auth||params.get('state')!==auth.state)throw Error('Login verification failed. Please connect again.');await exchange({grant_type:'authorization_code',code:params.get('code'),redirect_uri:redirect,client_id:SPOTIFY_CLIENT_ID,code_verifier:auth.verifier});}catch(err){status(err.message);return;}}if(token){$('setup').hidden=true;poll();}}
init();

;(() => {
const panel = document.getElementById('lyricsPanel');
const button = document.getElementById('fullscreenLyrics');
const lyrics = document.getElementById('lyrics');
let expanded = false;

function update() {
  expanded = document.fullscreenElement === panel || panel.classList.contains('lyrics-expanded');
  if (expanded && reportButton.parentElement !== reportButtonHome) reportButtonHome.prepend(reportButton);
  if (!expanded && displayedLyrics?.instrumental) lyrics.querySelector('.empty')?.append(reportButton);
  if (!reportBusy) setReportIdleLabel();
  button.textContent = expanded ? 'Exit fullscreen' : 'Fullscreen';
  button.setAttribute('aria-pressed', String(expanded));
  button.setAttribute('aria-label', expanded ? 'Exit lyrics fullscreen' : 'Show lyrics fullscreen');
  // Recenter after changing the available lyric area, including paused playback.
  requestAnimationFrame(() => {
    const active = lyrics.querySelector('.active');
    if (active && document.getElementById('follow').checked) {
      lyrics.scrollTop = active.offsetTop - lyrics.clientHeight / 2 + active.clientHeight / 2;
    }
  });
}

function exitFallback() {
  panel.classList.remove('lyrics-expanded');
  document.body.classList.remove('lyrics-fullscreen-open');
  update();
  button.focus();
}

button.addEventListener('click', async () => {
  if (document.fullscreenElement === panel) {
    try { await document.exitFullscreen(); } catch { /* Browser retains its own exit controls. */ }
    return;
  }
  if (expanded) { exitFallback(); return; }
  panel.classList.add('lyrics-expanded');
  document.body.classList.add('lyrics-fullscreen-open');
  update();
  button.focus();

});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) exitFallback();
  else { update(); button.focus(); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel.classList.contains('lyrics-expanded')) exitFallback();
});

})();

function updateControls(position) {
  for (const button of document.querySelectorAll('[data-playback]')) {
    button.disabled = controlBusy || (!token && !demo) || (demo && ['previous','next'].includes(button.dataset.playback));
    if (button.dataset.playback === 'toggle') {
      button.textContent = '';
      button.dataset.playing = String(playing);
      button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
  }
  for (const slider of document.querySelectorAll('.seek')) {
    slider.disabled = controlBusy || !track;
    if (document.activeElement !== slider) slider.value = track?.duration_ms ? Math.round(position/track.duration_ms*1000) : 0;
    slider.setAttribute('aria-valuetext', fmt(position)+' of '+fmt(track?.duration_ms||0));
  }
  for (const el of document.querySelectorAll('[data-control-position]')) el.textContent=fmt(position);
  for (const el of document.querySelectorAll('[data-control-duration]')) el.textContent=fmt(track?.duration_ms||0);
  $('controlReconnect').hidden = !token || demo || (token.scope||'').split(' ').includes(PLAYBACK_SCOPE);
}
async function controlPlayback(action, position=0) {
  if (controlBusy) return;
  if (demo) {
    if (action === 'toggle') {
      base = Math.min(track.duration_ms,base+(playing?performance.now()-sampled:0));
      if (!playing && base >= track.duration_ms) base=0;
      sampled=performance.now();playing=!playing;
    } else if (action === 'seek') {base=position;sampled=performance.now();}
    updateControls(base);return;
  }
  if (!token) {$('controlStatus').textContent='Sign in to control Spotify playback.';return;}
  if (!(token.scope||'').split(' ').includes(PLAYBACK_SCOPE)) {
    $('controlStatus').textContent='Sign in again to allow LyricSync to control playback.';
    $('controlReconnect').hidden=false;return;
  }
  if(activeDevice?.is_restricted){$('controlStatus').textContent=`Spotify marks ${activeDevice.name||'this device'} as restricted, so pause, seek, and skip are unavailable from LyricSync.`;return;}
  if (Date.now()<cooldown) {$('controlStatus').textContent='Please wait before trying another control.';return;}
  if (busy) {$('controlStatus').textContent='Refreshing Spotify. Try the control again in a moment.';return;}
  const session=generation;
  controlBusy=true;clearTimeout(timer);updateControls(base);
  const command=action==='toggle'?(playing?'pause':'play'):action;
  try {
    if (Date.now()>token.expires-30000) await exchange({grant_type:'refresh_token',refresh_token:token.refresh_token,client_id:SPOTIFY_CLIENT_ID});
    if (session!==generation || demo || !token) return;
    await sendPlayback(command,position,token.access_token,fetch,activeDevice?.id||'');
    if (session!==generation || demo || !token) return;
    if(command==='pause'){base=Math.min(track?.duration_ms||0,base+(playing?performance.now()-sampled:0));playing=false;}
    if(command==='play'){sampled=performance.now();playing=true;}
    if(command==='seek'){base=position;sampled=performance.now();}
    $('controlStatus').textContent='';
  } catch(error) {
    $('controlStatus').textContent=error.message;
    if(error.retryAfter)cooldown=Date.now()+error.retryAfter*1000;
  } finally {
    controlBusy=false;updateControls(base);
    if(token&&!demo)timer=setTimeout(()=>poll(),Math.max(700,cooldown-Date.now()));
  }
}
for(const button of document.querySelectorAll('[data-playback]'))button.addEventListener('click',()=>controlPlayback(button.dataset.playback));
for(const slider of document.querySelectorAll('.seek'))slider.addEventListener('change',()=>controlPlayback('seek',Math.min(Math.max(0,(track?.duration_ms||0)-1),Number(slider.value)/1000*(track?.duration_ms||0))));
$('controlReconnect').onclick=()=>{
  const panel=$('lyricsPanel');
  if(panel.classList.contains('lyrics-expanded'))$('fullscreenLyrics').click();
  $('setup').hidden=false;$('signIn').focus();
  status('Sign in with Spotify again to grant playback control permission.');
};
function applyTheme(theme) {
  document.documentElement.dataset.theme=theme;
  for(const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.textContent='';
    button.title=theme==='dark'?'Switch to light mode':'Switch to dark mode';
    button.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode');
  }
}
applyTheme(document.documentElement.dataset.theme==='light'?'light':'dark');
for(const button of document.querySelectorAll('[data-theme-toggle]'))button.addEventListener('click',()=>{
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  applyTheme(theme);try{localStorage.setItem('lyricsync.theme',theme);}catch{}
});

$('rejectLyrics').onclick=async()=>{
  if(reportBusy||demo||!track?.id||!Number.isSafeInteger(displayedLyrics?.id))return;
  const item=track,entryId=displayedLyrics.id,reportContent=displayedLyrics.instrumental?'The track is not instrumental':"The lyrics don't match the audio";
  try{saveRejection(item.id,displayedLyrics);}catch{
    $('feedbackStatus').textContent='Browser storage is unavailable. Could not remember the skipped version; no report sent.';return;
  }
  reportBusy=true;$('rejectLyrics').disabled=true;$('rejectLyrics').classList.add('reporting');$('rejectLyrics').setAttribute('aria-busy','true');
  const reportStarted=performance.now(),reportTimeout=160000;
  const updateReportProgress=()=>{const percent=Math.min(99,Math.floor((performance.now()-reportStarted)/reportTimeout*100));$('rejectLyrics').style.setProperty('--report-progress',percent+'%');$('rejectLyrics').textContent=`Reporting… ${percent}%`;};
  updateReportProgress();reportProgressTimer=setInterval(updateReportProgress,500);
  $('feedbackStatus').textContent=`Skipped version for ${item.name}. Sending report to LRCLIB…`;
  // Change local selection immediately while proof-of-work runs off the UI thread.
  getLyrics(item,++generation);
  try{
    await flagLyrics(entryId,{content:reportContent});
    $('feedbackStatus').textContent=`Reported the skipped version of ${item.name} to LRCLIB. It will stay excluded in this browser.`;
  }catch(error){
    $('feedbackStatus').textContent=`Version of ${item.name} stays skipped in this browser. Report not confirmed: ${error.message}`;
  }finally{
    clearInterval(reportProgressTimer);reportProgressTimer=null;reportBusy=false;$('rejectLyrics').classList.remove('reporting');$('rejectLyrics').removeAttribute('aria-busy');$('rejectLyrics').style.removeProperty('--report-progress');setReportIdleLabel();$('rejectLyrics').disabled=demo||!Number.isSafeInteger(displayedLyrics?.id);
  }
};
$('resetSkipped').onclick=()=>{
  if(!track?.id||demo)return;
  try{resetRejections(track.id);}catch{$('feedbackStatus').textContent='Could not reset browser preferences.';return;}
  $('feedbackStatus').textContent='Skipped versions reset for this song. Reports already sent to LRCLIB are not withdrawn.';
  getLyrics(track,++generation);
};
