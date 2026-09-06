// Fixed-purpose LRCLIB relay. No credentials or arbitrary upstream URLs.
import {createServer} from 'node:http';
const allowedOrigin=process.env.SITE_ORIGIN||'https://keethsmith.github.io';
const reportReasons=new Set(["The lyrics don't match the audio",'The track is not instrumental']);
const buckets=new Map();
const server=createServer(async(req,res)=>{
  res.setHeader('Vary','Origin');
  if(req.headers.origin!==allowedOrigin){res.writeHead(403);res.end('Origin not allowed');return;}
  res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Publish-Token');
  if(!['/api/request-challenge','/api/flag'].includes(req.url)){res.writeHead(404);res.end();return;}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method!=='POST'){res.writeHead(405);res.end();return;}
  const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').toString().split(',')[0].trim(),now=Date.now();
  for(const [key,bucket] of buckets)if(now-bucket.start>60000)buckets.delete(key);
  const bucket=buckets.get(ip)||{start:now,count:0};bucket.count++;buckets.set(ip,bucket);
  if(bucket.count>20){res.writeHead(429,{'Retry-After':'60'});res.end('Too many reports');return;}
  try{
    let bytes=0,chunks=[];
    for await(const chunk of req){bytes+=chunk.length;if(bytes>2048){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const options={method:'POST',signal:AbortSignal.timeout(20000)};
    if(req.url==='/api/flag'){
      const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const proof=req.headers['x-publish-token'];
      if(!Number.isSafeInteger(payload.trackId)||payload.trackId<=0||!reportReasons.has(payload.content)||typeof proof!=='string'||!/^[A-Za-z0-9]{32}:\d{1,20}$/.test(proof)){res.writeHead(400);res.end('Invalid report');return;}
      options.headers={'Content-Type':'application/json','X-Publish-Token':proof};
      options.body=JSON.stringify({trackId:payload.trackId,content:payload.content});
    }
    const upstream=await fetch('https://lrclib.net'+req.url,options);
    res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'text/plain','Cache-Control':'no-store'});
    res.end(await upstream.text());
  }catch{res.writeHead(502);res.end('Report result could not be confirmed.');}
});
server.listen(Number(process.env.PORT)||8787,process.env.HOST||'0.0.0.0',()=>console.log('LRCLIB report relay listening'));
