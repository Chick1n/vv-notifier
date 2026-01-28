# Youth Volleyball Notification System

A minimal web-based push notification system for parents and coaches. Parents subscribe once, pick teams, and receive push notifications even when the site is closed. Coaches send short updates from a private admin page.

## Features

- Web push notifications with service workers
- Team-based subscriptions (parents can pick multiple teams)
- Simple admin console to send updates
- SQLite-backed subscription storage
- PWA-ready manifest for home screen installation

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

### 3) Create environment variables

```bash
export VAPID_PUBLIC_KEY="<your-public-key>"
export VAPID_PRIVATE_KEY="<your-private-key>"
export ADMIN_TOKEN="<your-admin-token>"
```

### 4) Start the server

```bash
npm start
```

Visit:

- Parent signup: `http://localhost:3000/`
- Admin console: `http://localhost:3000/admin`

## Usage

1. Parents visit the main page, select teams, and enable notifications.
2. Coaches open the admin console, enter the admin token, select teams, and send an update.

## Notes

- iOS Safari requires adding the site to the home screen for push notifications.
- Subscription data is stored locally in `data/subscriptions.db`.
