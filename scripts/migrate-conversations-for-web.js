#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Normalize Firestore chat data for web compatibility.
 *
 * What it does:
 * 1) Ensures each conversation has participantIds[] (from participants or participant1_id/participant2_id)
 * 2) Sets updatedAt + lastMessageAt from legacy fields when missing
 * 3) Backfills lastMessageText from root messages collection (content/message/body)
 *
 * Usage:
 *   node scripts/migrate-conversations-for-web.js --project househunter-9be4d --key "C:/path/to/service-account.json"
 *
 * Optional:
 *   --dry-run   (prints planned changes only)
 */

const fs = require("fs");
const path = require("path");
let admin;
try {
  admin = require("firebase-admin");
} catch {
  try {
    admin = require(path.join(__dirname, "..", "web", "node_modules", "firebase-admin"));
  } catch {
    throw new Error(
      "Cannot find 'firebase-admin'. Install it in repo root (npm i firebase-admin) " +
      "or ensure web/node_modules exists (npm --prefix web i)."
    );
  }
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

const isDryRun = process.argv.includes("--dry-run");
const projectId = argValue("--project") || process.env.FIREBASE_ADMIN_PROJECT_ID || "househunter-9be4d";
const keyPathArg = argValue("--key");

function initAdmin() {
  if (admin.apps.length) return;

  if (keyPathArg) {
    const absolute = path.resolve(process.cwd(), keyPathArg);
    const json = JSON.parse(fs.readFileSync(absolute, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(json),
      projectId: json.project_id || projectId
    });
    return;
  }

  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n")
      }),
      projectId
    });
    return;
  }

  throw new Error(
    "Missing admin credentials. Pass --key <service-account.json> or set FIREBASE_ADMIN_* env vars."
  );
}

function toMillis(v) {
  if (!v) return undefined;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  return undefined;
}

function toTimestamp(ms) {
  if (!ms) return undefined;
  return admin.firestore.Timestamp.fromMillis(ms);
}

function isValidParticipantId(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  const lowered = normalized.toLowerCase();
  if (lowered === "undefined" || lowered === "null" || lowered === "nan") return false;
  return true;
}

function normalizeParticipantId(value) {
  return String(value).trim();
}

function pickParticipants(data) {
  const sourceIds = [];

  if (Array.isArray(data.participantIds)) {
    sourceIds.push(...data.participantIds);
  }
  if (Array.isArray(data.participants)) {
    sourceIds.push(...data.participants);
  }
  sourceIds.push(data.participant1_id, data.participant2_id);

  const normalized = sourceIds
    .filter(isValidParticipantId)
    .map(normalizeParticipantId);

  return [...new Set(normalized)];
}

function pickPreviewFromMessage(msg) {
  const raw =
    msg.content ??
    msg.text ??
    msg.message ??
    msg.body ??
    msg.lastMessageText ??
    msg.last_message_text;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const type = String(msg.message_type ?? msg.messageType ?? "").toLowerCase();
  if (type === "audio" || type === "voice") return "Voice message";
  if (type === "image") return "Image";
  if (type === "file") return "File";
  if (type === "location") return "Location";
  return undefined;
}

async function fetchLatestRootMessage(db, conversationId) {
  const messages = db.collection("messages");
  const candidates = [
    messages.where("conversation_id", "==", conversationId).orderBy("created_at", "desc").limit(1),
    messages.where("conversation_id", "==", conversationId).orderBy("createdAt", "desc").limit(1),
    messages.where("conversationId", "==", conversationId).orderBy("created_at", "desc").limit(1),
    messages.where("conversationId", "==", conversationId).orderBy("createdAt", "desc").limit(1),
    messages.where("conversation_id", "==", conversationId).limit(50),
    messages.where("conversationId", "==", conversationId).limit(50)
  ];

  for (const q of candidates) {
    try {
      const snap = await q.get();
      if (snap.empty) continue;
      const rows = snap.docs.map((d) => {
        const data = d.data();
        const at = toMillis(data.created_at ?? data.createdAt ?? data.sentAt ?? data.timestamp);
        return { text: pickPreviewFromMessage(data), at };
      });
      rows.sort((a, b) => (b.at || 0) - (a.at || 0));
      const top = rows[0];
      if (top) return top;
    } catch {
      // ignore and try next shape
    }
  }
  return null;
}

async function run() {
  initAdmin();
  const db = admin.firestore();
  const conversationsRef = db.collection("conversations");
  const snapshot = await conversationsRef.get();

  console.log(`Found ${snapshot.size} conversation docs`);
  let changed = 0;
  let skippedInvalidParticipants = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const patch = {};

    const participantIds = pickParticipants(data);
    if (participantIds.length >= 2) {
      patch.participantIds = participantIds;
    } else {
      skippedInvalidParticipants += 1;
      console.log(
        `[WARN] ${doc.id} has invalid or incomplete participant IDs, skipping participantIds patch`,
        {
          participant1_id: data.participant1_id,
          participant2_id: data.participant2_id,
          participants: data.participants,
          participantIds: data.participantIds
        }
      );
    }

    const legacyLastAt = toMillis(data.last_message_at ?? data.lastMessageAt);
    const updatedAt = toMillis(data.updatedAt ?? data.updated_at) || legacyLastAt || toMillis(data.created_at ?? data.createdAt);

    if (legacyLastAt && !data.lastMessageAt) patch.lastMessageAt = toTimestamp(legacyLastAt);
    if (updatedAt && !data.updatedAt) patch.updatedAt = toTimestamp(updatedAt);

    if (!data.lastMessageText && !data.last_message_text) {
      const latest = await fetchLatestRootMessage(db, doc.id);
      if (latest?.text) {
        patch.lastMessageText = latest.text;
      }
      if (latest?.at && !patch.lastMessageAt && !data.lastMessageAt) {
        patch.lastMessageAt = toTimestamp(latest.at);
      }
      if (latest?.at && !patch.updatedAt && !data.updatedAt) {
        patch.updatedAt = toTimestamp(latest.at);
      }
    }

    const keys = Object.keys(patch);
    if (!keys.length) continue;

    changed += 1;
    if (isDryRun) {
      console.log(`[DRY RUN] ${doc.id}`, patch);
    } else {
      await doc.ref.set(patch, { merge: true });
      console.log(`Updated ${doc.id}`);
    }
  }

  console.log(isDryRun ? `Would update ${changed} docs` : `Updated ${changed} docs`);
  console.log(`Skipped participantIds patch for ${skippedInvalidParticipants} docs with invalid IDs`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
