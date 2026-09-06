export const PLAYBACK_SCOPE = 'user-modify-playback-state';
export function playbackRequest(action, position = 0, deviceId = '') {
  const routes = {play:['PUT','play'],pause:['PUT','pause'],previous:['POST','previous'],next:['POST','next'],seek:['PUT',`seek?position_ms=${Math.max(0,Math.round(position))}`]};
  if (!routes[action]) throw Error('Unknown playback control.');
  const url=new URL('https://api.spotify.com/v1/me/player/'+routes[action][1]);
  if(deviceId)url.searchParams.set('device_id',deviceId);
  return {method:routes[action][0],url:url.href};
}
export async function sendPlayback(action, position, accessToken, request = fetch, deviceId = '') {
  const {method,url} = playbackRequest(action,position,deviceId);
  const response = await request(url,{method,headers:{Authorization:`Bearer ${accessToken}`}});
  if (response.ok) return;
  if (response.status === 401) throw Error('Your session expired. Sign in again to control playback.');
  if (response.status === 404) throw Error('Open Spotify and play a song on a device first.');
  if (response.status === 403) throw Error('Playback controls require Spotify Premium and playback permission. Sign in again if needed.');
  if (response.status === 429) {
    const error = Error('Spotify is busy. Please wait before trying another control.');
    error.retryAfter = Math.max(5,Number(response.headers.get('Retry-After'))||30);
    throw error;
  }
  throw Error('Spotify could not complete that control. Try again.');
}
