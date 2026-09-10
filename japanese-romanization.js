globalThis.JapaneseRomanization=(()=>{
  const containsJapanese=text=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(text||'');
  const japaneseRun=/[\u3040-\u30ff\u3400-\u9fff]+/gu;
  const engine=new Kuroshiro.default();
  let ready;

  async function romanizeJapanese(text=''){
    if(!containsJapanese(text))return text;
    try{
      ready ||= engine.init(new KuromojiAnalyzer({dictPath:'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/'}));
      await ready;
      const runs=[...text.matchAll(japaneseRun)];
      const converted=await Promise.all(runs.map(match=>engine.convert(match[0],{to:'romaji',mode:'spaced'})));
      let output='',cursor=0;
      runs.forEach((match,index)=>{
        output+=text.slice(cursor,match.index)+converted[index];
        cursor=match.index+match[0].length;
      });
      return output+text.slice(cursor);
    }catch{
      return text;
    }
  }

  return {containsJapanese,romanizeJapanese};
})();
