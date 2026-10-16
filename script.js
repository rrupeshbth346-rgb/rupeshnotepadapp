
const $ = (id) => document.getElementById(id);

const titleInput = $("noteTitle");
const contentInput = $("noteContent");
const notesList = $("notesList");

let notes = [];
let activeId = null;
let saveTimer = null;

// Load notes saved in this browser
try {
  notes = JSON.parse(localStorage.getItem("notepadNotes")) || [];
  if (!Array.isArray(notes)) notes = [];
} catch {
  notes = [];
}

function saveAll() {
  try {
    localStorage.setItem("notepadNotes", JSON.stringify(notes));
    $("saveStatus").innerHTML =
      '<span class="status-dot"></span> All changes saved';
    return true;
  } catch {
    $("saveStatus").textContent =
      "Storage full or unavailable — download your note";
    return false;
  }
}

function createNote() {
  const now = new Date();

  const note = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    title: "",
    content: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  notes.unshift(note);
  activeId = note.id;
  saveAll();
  renderNotes();
  loadNote(note.id);
  titleInput.focus();
}

function currentNote() {
  return notes.find(note => note.id === activeId);
}

function saveCurrent() {
  const note = currentNote();
  if (!note) return;

  note.title = titleInput.value;
  note.content = contentInput.value;
  note.updatedAt = new Date().toISOString();

  $("saveStatus").innerHTML =
    '<span class="status-dot"></span> Saving...';

  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    saveAll();
    renderNotes();
    updateStats();
  }, 300);
}

function loadNote(id) {
  activeId = id;
  const note = currentNote();

  if (!note) {
    titleInput.value = "";
    contentInput.value = "";
    updateStats();
    renderNotes();
    return;
  }

  titleInput.value = note.title;
  contentInput.value = note.content;

  $("dateLabel").textContent =
    "Edited " + new Date(note.updatedAt).toLocaleString();

  updateStats();
  renderNotes();
}

function renderNotes() {
  const query = $("searchInput").value.toLowerCase().trim();

  const filtered = notes.filter(note =>
    (note.title + " " + note.content).toLowerCase().includes(query)
  );

  $("noteCount").textContent = notes.length;

  if (!filtered.length) {
    notesList.innerHTML =
      '<p class="empty-notes">No notes found.<br>Create a new note to get started.</p>';
    return;
  }

  notesList.innerHTML = filtered.map(note => {
    const title = escapeHTML(note.title.trim() || "Untitled Note");
    const preview = escapeHTML(
      note.content.replace(/\s+/g, " ").trim().slice(0, 65) ||
      "No additional text"
    );

    const date = new Date(note.updatedAt).toLocaleDateString();

    return `
      <button class="note-item ${note.id === activeId ? "active" : ""}"
              data-id="${escapeHTML(note.id)}">
        <strong>${title}</strong>
        <small>${preview}</small>
        <small>${date}</small>
      </button>
    `;
  }).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function updateStats() {
  const text = contentInput.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  $("wordCount").textContent = `${words} words`;
  $("charCount").textContent = `${text.length} characters`;

  const note = currentNote();
  $("dateLabel").textContent = note
    ? "Last edited " + new Date(note.updatedAt).toLocaleString()
    : "New note";
}

function deleteCurrent() {
  const note = currentNote();
  if (!note) return;

  if (!confirm("Delete this note permanently from this browser?")) return;

  clearTimeout(saveTimer);
  notes = notes.filter(item => item.id !== activeId);
  activeId = notes.length ? notes[0].id : null;

  saveAll();

  if (activeId) {
    loadNote(activeId);
  } else {
    titleInput.value = "";
    contentInput.value = "";
    updateStats();
  }

  renderNotes();
}

function downloadCurrent() {
  const note = currentNote();

  if (!note) {
    alert("Create a note before downloading.");
    return;
  }

  const filename = (titleInput.value.trim() || "Untitled-Note")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .slice(0, 100);

  const text =
    titleInput.value + "\n" +
    "=".repeat(Math.max(titleInput.value.length, 12)) +
    "\n\n" + contentInput.value;

  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename + ".txt";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

titleInput.addEventListener("input", saveCurrent);
contentInput.addEventListener("input", saveCurrent);

notesList.addEventListener("click", event => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  clearTimeout(saveTimer);
  saveAll();
  loadNote(button.dataset.id);
});

$("newBtn").addEventListener("click", createNote);
$("deleteBtn").addEventListener("click", deleteCurrent);
$("downloadBtn").addEventListener("click", downloadCurrent);

$("searchInput").addEventListener("input", renderNotes);

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");

  const light = document.body.classList.contains("light");
  $("themeBtn").textContent = light ? "🌙" : "☀️";

  try {
    localStorage.setItem("notepadTheme", light ? "light" : "dark");
  } catch {}
});

// Restore theme and existing notes
try {
  if (localStorage.getItem("notepadTheme") === "light") {
    document.body.classList.add("light");
    $("themeBtn").textContent = "🌙";
  }
} catch {}

renderNotes();

if (notes.length) {
  loadNote(notes[0].id);
} else {
  createNote();
}
