export function parseLrc(text='') {
  const lines=[];
  const offset=Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0);
  for(const row of text.split(/\r?\n/)) {
    const stamps=[...row.matchAll(/\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const words=row.replace(/\[[^\]]*\]/g,'').trim();
    for(const stamp of stamps) lines.push({time:Number(stamp[1])*60000+Number(stamp[2])*1000+Number((stamp[3]||'').padEnd(3,'0'))-offset,text:words||'♪'});
  }
  return lines.sort((a,b)=>a.time-b.time);
}
export function activeLine(lines,position){let lo=0,hi=lines.length-1,result=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(lines[mid].time<=position){result=mid;lo=mid+1;}else hi=mid-1;}return result;}
