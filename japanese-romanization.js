globalThis.JapaneseRomanization=(()=>{
  const containsJapanese=text=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(text||'');
  const japaneseRun=/[\u3040-\u30ff\u3400-\u9fff]+/gu;
  let worker=null,nextId=0,idleTimer;
  const pending=new Map();
  function stopWhenIdle(){
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{if(!pending.size){worker?.terminate();worker=null;}},1000);
  }
  function convertRun(text){
    if(!worker){
      worker=new Worker('./japanese-worker.js?v=memory-1');
      worker.onmessage=({data})=>{
        const request=pending.get(data.id);if(!request)return;
        pending.delete(data.id);request.resolve(data.error?request.original:data.text);stopWhenIdle();
      };
      worker.onerror=()=>{
        for(const request of pending.values())request.resolve(request.original);
        pending.clear();worker?.terminate();worker=null;
      };
    }
    const id=++nextId;
    return new Promise(resolve=>{pending.set(id,{resolve,original:text});worker.postMessage({id,text});});
  }
  async function romanizeJapanese(text=''){
    if(!containsJapanese(text))return text;
    const runs=[...text.matchAll(japaneseRun)];
    const converted=await Promise.all(runs.map(match=>convertRun(match[0])));
    let output='',cursor=0;
    runs.forEach((match,index)=>{output+=text.slice(cursor,match.index)+converted[index];cursor=match.index+match[0].length;});
    return output+text.slice(cursor);
  }
  return {containsJapanese,romanizeJapanese};
})();
