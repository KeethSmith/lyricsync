export function lyricFingerprint(entry){
  const source=entry?.plainLyrics||entry?.syncedLyrics||'';
  return String(source).normalize('NFKC').toLowerCase()
    .replace(/\[(?:\d{1,3}:)?\d{1,2}:\d{2}(?:[.:]\d+)?\]/g,' ')
    .replace(/<(?:\d{1,3}:)?\d{1,2}:\d{2}(?:[.:]\d+)?>/g,' ')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
