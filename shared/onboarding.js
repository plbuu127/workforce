// Only known app routes and invitation fragments may be carried through sign-in.
// A fragment is never interpreted as a different origin or a script URL.
export function loginReturnPath(pathname='/',hash=''){
 const path=['/','/employee','/hr','/companies'].includes(pathname)?pathname:'/';
 const q=new URLSearchParams(hash.replace(/^#/,'')),pattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
 for(const name of ['join','team']){const value=q.get(name);if(pattern.test(value||''))return path+'#'+name+'='+value;}
 return path;
}
export function loginHref(pathname,hash){return '/signin-with-chatgpt?return_to='+encodeURIComponent(loginReturnPath(pathname,hash));}
