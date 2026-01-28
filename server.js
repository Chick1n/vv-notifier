const path = require("path");
const fs = require("fs");
const express = require("express");
const webpush = require("web-push");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "subscriptions.db");

const adminToken = process.env.ADMIN_TOKEN || "";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    endpoint TEXT PRIMARY KEY,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    teams TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY. Generate with: npx web-push generate-vapid-keys"
  );
} else {
  webpush.setVapidDetails(
    "mailto:coach@volleyballclub.example",
    vapidPublicKey,
    vapidPrivateKey
  );
}

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get("/api/vapidPublicKey", (req, res) => {
  if (!vapidPublicKey) {
    return res.status(500).json({ error: "VAPID public key not configured." });
  }
  return res.json({ publicKey: vapidPublicKey });
});

app.post("/api/subscribe", (req, res) => {
  const { subscription, teams } = req.body || {};
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "Missing subscription payload." });
  }
  if (!Array.isArray(teams) || teams.length === 0) {
    return res.status(400).json({ error: "Select at least one team." });
  }

  const now = new Date().toISOString();
  const record = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    teams: JSON.stringify(teams),
    created_at: now,
    updated_at: now
  };

  const stmt = db.prepare(`
    INSERT INTO subscriptions (endpoint, p256dh, auth, teams, created_at, updated_at)
    VALUES (@endpoint, @p256dh, @auth, @teams, @created_at, @updated_at)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      teams = excluded.teams,
      updated_at = excluded.updated_at
  `);

  stmt.run(record);

  return res.json({ success: true });
});

app.post("/api/unsubscribe", (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint." });
  }

  db.prepare("DELETE FROM subscriptions WHERE endpoint = ?").run(endpoint);
  return res.json({ success: true });
});

app.post("/api/update", async (req, res) => {
  if (!adminToken || req.header("x-admin-token") !== adminToken) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const { message, teams, title } = req.body || {};
  if (!message || !Array.isArray(teams) || teams.length === 0) {
    return res.status(400).json({ error: "Message and teams are required." });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: "VAPID keys not configured." });
  }

  const allSubscriptions = db.prepare("SELECT * FROM subscriptions").all();
  const matchingSubscriptions = allSubscriptions.filter((row) => {
    try {
      const storedTeams = JSON.parse(row.teams);
      return storedTeams.some((team) => teams.includes(team));
    } catch (error) {
      return false;
    }
  });

  const payload = JSON.stringify({
    title: title || "Practice Update",
    body: message,
    teams
  });

  const results = await Promise.all(
    matchingSubscriptions.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      };

      try {
        await webpush.sendNotification(subscription, payload);
        return { endpoint: row.endpoint, success: true };
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          db.prepare("DELETE FROM subscriptions WHERE endpoint = ?").run(row.endpoint);
        }
        return { endpoint: row.endpoint, success: false, error: error.message };
      }
    })
  );

  return res.json({
    success: true,
    sent: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
});
