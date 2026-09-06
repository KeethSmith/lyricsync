export function parseLrc(text='') {
  const lines=[];
  const offset=Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0);
  const timestamp=s=>Number(s[1])*60000+Number(s[2])*1000+Number((s[3]||'').padEnd(3,'0'))-offset;
  for(const row of text.split(/\r?\n/)) {
    const stamps=[...row.matchAll(/\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const content=row.replace(/\[[^\]]*\]/g,'').trim();
    const words=content.replace(/<\d+:\d{2}(?:\.\d{1,3})?>/g,'').trim();
    const markers=[...content.matchAll(/<(\d+):(\d{2})(?:\.(\d{1,3}))?>([^<]*)/g)];
    const timed=markers.filter(m=>m[4].trim()).map(m=>({time:timestamp(m),text:m[4]}));
    const complete=timed.map(w=>w.text).join('').trim()===words;
    const ordered=timed.every((w,i)=>!i||w.time>=timed[i-1].time);
    for(const stamp of stamps){
      const line={time:timestamp(stamp),text:words||'♪'};
      if(timed.length&&complete&&ordered)line.words=timed.map(w=>({...w,time:w.time+timestamp(stamp)-timestamp(stamps[0])}));
      lines.push(line);
    }
  }
  return lines.sort((a,b)=>a.time-b.time);
}
export function activeLine(lines,position){let lo=0,hi=lines.length-1,result=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(lines[mid].time<=position){result=mid;lo=mid+1;}else hi=mid-1;}return result;}
