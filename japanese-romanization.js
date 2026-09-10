globalThis.JapaneseRomanization=(()=>{
  const containsJapanese=text=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(text||'');
  const engine=new Kuroshiro.default();
  let ready;

  async function romanizeJapanese(text=''){
    if(!containsJapanese(text))return text;
    try{
      ready ||= engine.init(new KuromojiAnalyzer({dictPath:'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/'}));
      await ready;
      return await engine.convert(text,{to:'romaji',mode:'spaced'});
    }catch{
      return text;
    }
  }

  return {containsJapanese,romanizeJapanese};
})();
