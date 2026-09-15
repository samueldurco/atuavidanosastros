import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
export const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
export const file=(path)=>readFile(new URL('../../'+path,import.meta.url),'utf8');
// Synthetic auth/storage stubs. Does not certify hosted JWT, PostgREST or independent connections.
export async function setupProductDatabase({processing=false}={}) {
  const db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema extensions; create schema auth; create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;`);
  for(const path of ['20260902170000_initial_platform.sql','20260907112000_saved_calculation_results.sql','20260909230000_product_runs.sql','20260914120000_product_run_reader.sql',
    ...(processing?['20260914140000_product_run_processing.sql']:[]),'20260915130000_product_cartography.sql']) await db.exec(await file('supabase/migrations/'+path));
  await db.query('insert into auth.users(id) values ($1),($2)',[owner,other]);
  return db;
}
