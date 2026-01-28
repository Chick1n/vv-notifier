const sendBtn = document.getElementById("send-btn");
const statusEl = document.getElementById("admin-status");
const messageEl = document.getElementById("message");
const titleEl = document.getElementById("title");
const tokenEl = document.getElementById("admin-token");
const teamOptions = document.getElementById("admin-team-options");

const getSelectedTeams = () => {
  return Array.from(teamOptions.querySelectorAll("input[type='checkbox']:checked")).map(
    (input) => input.value
  );
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

sendBtn.addEventListener("click", async () => {
  const message = messageEl.value.trim();
  const teams = getSelectedTeams();
  const title = titleEl.value.trim();
  const token = tokenEl.value.trim();

  if (!message) {
    setStatus("Please add a message.");
    return;
  }

  if (teams.length === 0) {
    setStatus("Select at least one team.");
    return;
  }

  if (!token) {
    setStatus("Admin token required.");
    return;
  }

  try {
    const response = await fetch("api/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token
      },
      body: JSON.stringify({ message, teams, title })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to send update.");
    }

    setStatus(`Sent to ${data.sent} subscriptions. ${data.failed} failed.`);
    messageEl.value = "";
  } catch (error) {
    setStatus(error.message);
  }
});
