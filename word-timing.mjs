// Line-level LRC has no vocal alignment. These are visual estimates, not measured word timestamps.
export function estimateWords(text,start,end) {
  const words=text.trim().split(/\s+/u).filter(Boolean);
  const duration=Math.max(0,end-start);
  const weights=words.map(word=>Math.max(1,[...word.replace(/[^\p{L}\p{N}]/gu,'')].length));
  const total=weights.reduce((sum,weight)=>sum+weight,0);
  let elapsed=0;
  return words.map((text,index)=>{
    const time=start+(total?elapsed/total*duration:0);
    elapsed+=weights[index];
    return {text,time};
  });
}
export function currentWord(words,position) {
  let active=-1;
  for(let i=0;i<words.length;i++){if(words[i].time>position)break;active=i;}
  return active;
}
