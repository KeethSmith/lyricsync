importScripts('./vendor/kuroshiro.min.js','./vendor/kuroshiro-analyzer-kuromoji.min.js');
const engine=new Kuroshiro.default();
const ready=engine.init(new KuromojiAnalyzer({dictPath:'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/'}));
self.onmessage=async({data})=>{
  try{await ready;self.postMessage({id:data.id,text:await engine.convert(data.text,{to:'romaji',mode:'spaced'})});}
  catch{self.postMessage({id:data.id,error:true});}
};
