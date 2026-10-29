import http from "node:http";
import {localBucket} from "./r2-adapter.mjs";
import worker from "../dist/server/index.js";
import { mkdir, readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { localDatabase } from "./sqlite-adapter.mjs";

const port = Number(process.env.PORT || 4190);
await mkdir(new URL("../.preview-data/", import.meta.url), { recursive: true });
const env = { WORKFORCE_OPERATOR_USER_ID:"local_workforce_demo", INTAKE_LOCAL_PREVIEW:true, BUCKET:localBucket(new URL("../.preview-data/files/", import.meta.url).pathname), DB: await localDatabase(new URL("../.preview-data/workforce.sqlite", import.meta.url).pathname) };
// Explicit local opt-in only. Normal previews/tests never load a real key.
if (process.env.WORKFORCE_PREVIEW_AI === "1") {
  const local = parseEnv(await readFile((process.env.WORKFORCE_ENV_FILE || new URL("../.env.nebius.local", import.meta.url)), "utf8"));
  if (!local.NEBIUS_API_KEY) throw new Error("Local AI key missing");
  env.NEBIUS_API_KEY = local.NEBIUS_API_KEY;
  env.NEBIUS_AI_ENABLED = "true";
}

const server = http.createServer(async (req, res) => {
  const localUrl=new URL(req.url,`http://127.0.0.1:${port}`);
  if(localUrl.pathname==='/__local_role') {
    const requested=localUrl.searchParams.get('role');const role=['employee','anonymous'].includes(requested)?requested:'reviewer';
    res.writeHead(303,{'set-cookie':`intake_local_role=${role}; HttpOnly; SameSite=Strict; Path=/`,location:'/hr'});res.end();return;
  }
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : req;
  const headers = new Headers(req.headers);
  // This loopback-only dev identity never enters the production build.
  for (const name of [...headers.keys()]) if (name.startsWith("oai-authenticated-user-")) headers.delete(name);
  if(!/(?:^|; )intake_local_role=anonymous(?:;|$)/.test(req.headers.cookie||""))headers.set("oai-authenticated-user-id", /(?:^|; )intake_local_role=employee(?:;|$)/.test(req.headers.cookie||"") ? "local_employee_test" : "local_workforce_demo");
  if(headers.has("oai-authenticated-user-id"))headers.set("oai-authenticated-user-email",headers.get("oai-authenticated-user-id")+"@example.test");
  const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
    method: req.method,
    headers,
    body,
    duplex: body ? "half" : undefined,
  });
  const response = await worker.fetch(request, env, {});
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(port, "127.0.0.1", () => console.log(`Workforce preview: http://127.0.0.1:${port}`));
