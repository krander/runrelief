// Keeps the free-tier Supabase project active by periodically inserting and
// deleting a throwaway row in community_pins. Run on a schedule via
// .github/workflows/supabase-heartbeat.yml.

import { readFile, writeFile } from 'node:fs/promises';

const STATE_PATH = new URL('../.github/heartbeat-state.json', import.meta.url);

const HEARTBEAT_USER_ID = '00000000-0000-0000-0000-000000000000';
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
const PIN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MIN_DELETE_DELAY_MS = 2 * 60 * 60 * 1000;
const MAX_DELETE_DELAY_MS = 4 * 60 * 60 * 1000;

function fail(message, err) {
  console.error(`[heartbeat] ${message}`);
  if (err) console.error(err);
  process.exit(1);
}

async function readState() {
  const defaultState = { lastInsertAt: null, pendingPinId: null, pendingDeleteAt: null };
  try {
    const raw = await readFile(STATE_PATH, 'utf8');
    return { ...defaultState, ...JSON.parse(raw) };
  } catch (err) {
    if (err.code === 'ENOENT') return defaultState;
    throw err;
  }
}

async function writeState(state) {
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) fail(`missing required environment variable ${name}`);
  return value;
}

function randomDeleteDelayMs() {
  return MIN_DELETE_DELAY_MS + Math.random() * (MAX_DELETE_DELAY_MS - MIN_DELETE_DELAY_MS);
}

async function deletePin(supabaseUrl, serviceRoleKey, pinId) {
  const url = `${supabaseUrl}/rest/v1/community_pins?id=eq.${pinId}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
  } catch (err) {
    fail(`network error deleting heartbeat pin ${pinId}`, err);
  }
  if (!response.ok) {
    fail(`failed to delete heartbeat pin ${pinId}: ${response.status} ${await response.text()}`);
  }
}

async function insertPin(supabaseUrl, serviceRoleKey, expiresAt) {
  const url = `${supabaseUrl}/rest/v1/community_pins`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        latitude: 0,
        longitude: 0,
        type: 'restroom',
        is_heartbeat: true,
        user_identifier: HEARTBEAT_USER_ID,
        expires_at: expiresAt,
      }),
    });
  } catch (err) {
    fail('network error inserting heartbeat pin', err);
  }
  if (!response.ok) {
    fail(`failed to insert heartbeat pin: ${response.status} ${await response.text()}`);
  }
  const rows = await response.json();
  const id = rows?.[0]?.id;
  if (!id) fail(`insert response did not include an id: ${JSON.stringify(rows)}`);
  return id;
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const state = await readState();
  const now = Date.now();
  let action = 'no-op';

  if (state.pendingPinId && now >= new Date(state.pendingDeleteAt).getTime()) {
    await deletePin(supabaseUrl, serviceRoleKey, state.pendingPinId);
    console.log(`[heartbeat] deleted pin ${state.pendingPinId}`);
    state.pendingPinId = null;
    state.pendingDeleteAt = null;
    action = 'deleted';
  }

  if (
    !state.pendingPinId &&
    (state.lastInsertAt === null || now - new Date(state.lastInsertAt).getTime() >= SIX_DAYS_MS)
  ) {
    const expiresAt = new Date(now + PIN_LIFETIME_MS).toISOString();
    const id = await insertPin(supabaseUrl, serviceRoleKey, expiresAt);
    state.pendingPinId = id;
    state.pendingDeleteAt = new Date(now + randomDeleteDelayMs()).toISOString();
    state.lastInsertAt = new Date(now).toISOString();
    console.log(`[heartbeat] inserted pin ${id}, scheduled for deletion at ${state.pendingDeleteAt}`);
    action = action === 'deleted' ? 'deleted+inserted' : 'inserted';
  }

  if (action === 'no-op') {
    console.log('[heartbeat] no-op, nothing to do');
  }

  await writeState(state);
}

main().catch((err) => fail('unexpected error', err));
