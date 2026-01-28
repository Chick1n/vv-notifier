const statusEl = document.getElementById("status");
const enableBtn = document.getElementById("enable-btn");
const saveBtn = document.getElementById("save-btn");
const unsubscribeBtn = document.getElementById("unsubscribe-btn");

const teamOptions = document.getElementById("team-options");

const getSelectedTeams = () => {
  return Array.from(teamOptions.querySelectorAll("input[type='checkbox']:checked")).map(
    (input) => input.value
  );
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const getServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }
  return navigator.serviceWorker.register("/sw.js");
};

const getExistingSubscription = async () => {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

const fetchVapidKey = async () => {
  const response = await fetch("/api/vapidPublicKey");
  if (!response.ok) {
    throw new Error("VAPID key missing. Please contact your coach.");
  }
  const data = await response.json();
  return data.publicKey;
};

const subscribeForTeams = async () => {
  const teams = getSelectedTeams();
  if (teams.length === 0) {
    setStatus("Please select at least one team.");
    return;
  }

  try {
    const registration = await getServiceWorker();
    const existingSubscription = await registration.pushManager.getSubscription();

    const publicKey = await fetchVapidKey();
    const subscription =
      existingSubscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }));

    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ subscription, teams })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Subscription failed.");
    }

    setStatus("Subscribed! You will receive updates for: " + teams.join(", ") + ".");
  } catch (error) {
    setStatus(error.message);
  }
};

const updatePreferences = async () => {
  const teams = getSelectedTeams();
  if (teams.length === 0) {
    setStatus("Select at least one team to save preferences.");
    return;
  }

  try {
    const subscription = await getExistingSubscription();
    if (!subscription) {
      setStatus("Enable notifications first.");
      return;
    }

    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ subscription, teams })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Could not save preferences.");
    }

    setStatus("Preferences updated for: " + teams.join(", ") + ".");
  } catch (error) {
    setStatus(error.message);
  }
};

const unsubscribe = async () => {
  try {
    const subscription = await getExistingSubscription();
    if (!subscription) {
      setStatus("You are not subscribed.");
      return;
    }

    await fetch("/api/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    await subscription.unsubscribe();

    setStatus("You are unsubscribed. You can re-enable notifications any time.");
  } catch (error) {
    setStatus("Unable to unsubscribe. Please try again.");
  }
};

const refreshStatus = async () => {
  try {
    const subscription = await getExistingSubscription();
    if (subscription) {
      setStatus("Notifications enabled. Update your team preferences any time.");
    }
  } catch (error) {
    setStatus("Service worker not ready.");
  }
};

enableBtn.addEventListener("click", subscribeForTeams);
saveBtn.addEventListener("click", updatePreferences);
unsubscribeBtn.addEventListener("click", unsubscribe);

refreshStatus();
