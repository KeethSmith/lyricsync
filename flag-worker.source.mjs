import {sha256} from '@noble/hashes/sha2.js';
self.onmessage=({data:{prefix,target}})=>{
  if(typeof prefix!=='string'||!/^[a-f\d]{64}$/i.test(target)){self.postMessage({error:'Invalid LRCLIB challenge.'});return;}
  const threshold=Uint8Array.from(target.match(/../g),hex=>parseInt(hex,16));
  const encoder=new TextEncoder(),deadline=Date.now()+120000;
  for(let nonce=0;Number.isSafeInteger(nonce);nonce++){
    if(nonce%10000===0&&Date.now()>deadline){self.postMessage({error:'LRCLIB report verification timed out.'});return;}
    const hash=sha256(encoder.encode(prefix+nonce));
    let valid=true;
    for(let i=0;i<32;i++){if(hash[i]<threshold[i])break;if(hash[i]>threshold[i]){valid=false;break;}}
    if(valid){self.postMessage({token:prefix+':'+nonce});return;}
  }
};
