CREATE TABLE workforce_accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE workforce_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,employee_id TEXT,email TEXT NOT NULL,employee_email TEXT,name TEXT NOT NULL,kind TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX workforce_sessions_expiry ON workforce_sessions(expires_at);
CREATE TABLE workforce_runtime_rates(scope TEXT PRIMARY KEY,window INTEGER NOT NULL,calls INTEGER NOT NULL);
CREATE TABLE workforce_uploads(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,target TEXT NOT NULL,content_type TEXT NOT NULL,size INTEGER NOT NULL,expires_at INTEGER NOT NULL,claimed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE workforce_upload_chunks(upload_id TEXT NOT NULL,part INTEGER NOT NULL,bytes BLOB NOT NULL,PRIMARY KEY(upload_id,part));
