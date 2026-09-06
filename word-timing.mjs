export function currentWord(words,position) {
  let active=-1;
  for(let i=0;i<words.length;i++){if(words[i].time>position)break;active=i;}
  return active;
}
