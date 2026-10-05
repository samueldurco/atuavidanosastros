-- Non-destructive containment: preserve the encrypted connection and its owner.
-- The app must report storage unavailable; do not restore broader public grants.
revoke all on public.tiktok_connections from public, anon, authenticated, service_role;
