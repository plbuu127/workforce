import {put,get,del} from '@vercel/blob';
export function blobBucket(token=process.env.BLOB_READ_WRITE_TOKEN){
 if(!token)return null;
 return {async put(key,bytes,opt={}){await put(key,bytes,{token,access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:opt.httpMetadata?.contentType||'application/octet-stream'});},async get(key){const r=await get(key,{token,access:'private',useCache:false});if(!r)return null;return {body:r.stream,arrayBuffer:()=>new Response(r.stream).arrayBuffer()};},async delete(keys){await del(keys,{token});}};
}
