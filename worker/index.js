import {handleDemo} from './demo.js';
import { handleIntake } from './intake-api.js';

const pageHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'SAMEORIGIN',
  'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self' blob:; img-src 'self' data: blob:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
};

export default {
  async fetch(request, env = {}) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/demo' || pathname.startsWith('/api/demo/')) return handleDemo(request,env,appAssets);
    if (pathname === '/api/intake' || pathname.startsWith('/api/intake/')) {
      return handleIntake(request, env);
    }
    const pageRoute = ['/', '/hr', '/employee', '/companies','/operator','/demo'].includes(pathname);
    const asset = Object.hasOwn(appAssets, pathname) && appAssets[pathname];
    if (!pageRoute && !asset) return new Response('Not found', { status: 404 });
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    if (pageRoute) return new Response(request.method === 'HEAD' ? null : pathname==='/demo'?demoPage:pathname==='/operator'?operatorPage:intakePage, { headers: pageHeaders });
    const body = asset.encoding === 'base64' ? Uint8Array.from(atob(asset.body), c => c.charCodeAt(0)) : asset.body;
    return new Response(request.method === 'HEAD' ? null : body, { headers: {
      'content-type': asset.type, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff',
    } });
  },
};
