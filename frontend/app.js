// app.js — chat UI logic
const API_BASE = "http://localhost:8000";
const SESSION_ID = crypto.randomUUID();

async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (!message) return;

  appendMessage("You", message);
  input.value = "";

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: SESSION_ID }),
  });

  const data = await res.json();
  appendMessage("AI", data.reply);

  // Show "Show me my city" button after a few exchanges
  if (data.ready) {
    document.getElementById("city-result").classList.remove("hidden");
  }
}

async function getCity() {
  const res = await fetch(`${API_BASE}/city-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "give me my city", session_id: SESSION_ID }),
  });

  const data = await res.json();
  document.getElementById("city-image").src = data.image || "";
  document.getElementById("city-name").textContent = data.city || "";
  document.getElementById("city-description").textContent = data.description || "";
  document.getElementById("weather-info").textContent = JSON.stringify(data.weather, null, 2);
}

function appendMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const p = document.createElement("p");
  p.innerHTML = `<strong>${sender}:</strong> ${text}`;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
}

// Allow Enter key to send
document.getElementById("user-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
