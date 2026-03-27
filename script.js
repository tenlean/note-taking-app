function updateCalendar() {
  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const month = monthNames[now.getMonth()];

  document.getElementById("day").textContent = day;
  document.getElementById("month").textContent = month;
}

function showView(viewId) {
  const views = ["homeView", "calendarView", "noteEditorView"];

  views.forEach((id) => {
    const view = document.getElementById(id);
    if (!view) {
      return;
    }

    view.classList.toggle("hidden-view", id !== viewId);
  });
}

let allNotes = [];
let currentEditingNote = null;

async function loadNotesFromFiles() {
  try {
    allNotes = await window.electron.notes.loadAll();
    renderNotes();
  } catch (error) {
    console.error("Error loading notes:", error);
  }
}

function renderNotes() {
  const notesList = document.getElementById("notesList");

  if (allNotes.length === 0) {
    notesList.innerHTML = '<div class="notes-empty">No notes yet</div>';
    return;
  }

  notesList.innerHTML = allNotes
    .map(
      (note) =>
        `<div class="note-item">
      <button class="note-open-btn" data-id="${note.id}" type="button">${note.title}</button>
      <button class="note-delete-btn" data-id="${note.id}" type="button">×</button>
    </div>`,
    )
    .join("");

  document.querySelectorAll(".note-open-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      openNoteEditor(id);
    });
  });

  document.querySelectorAll(".note-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      await deleteNote(id);
    });
  });
}

function createNewNote() {
  const noteId = "note-" + Date.now();
  currentEditingNote = {
    id: noteId,
    title: "New Note",
    content: "",
  };

  document.getElementById("noteTitleInput").value = "New Note";
  document.getElementById("noteContentInput").value = "";

  showView("noteEditorView");
}

function openNoteEditor(noteId) {
  const note = allNotes.find((n) => n.id === noteId);
  if (!note) return;

  currentEditingNote = {
    id: note.id,
    title: note.title,
    content: note.content,
  };

  document.getElementById("noteTitleInput").value = note.title;
  document.getElementById("noteContentInput").value = note.content;

  showView("noteEditorView");
}

async function saveCurrentNote() {
  if (!currentEditingNote) return;

  const title = document.getElementById("noteTitleInput").value || "Untitled";
  const content = document.getElementById("noteContentInput").value;

  currentEditingNote.title = title;
  currentEditingNote.content = content;

  try {
    const result = await window.electron.notes.save(currentEditingNote);
    if (result.success) {
      const existingIndex = allNotes.findIndex(
        (n) => n.id === currentEditingNote.id,
      );
      if (existingIndex >= 0) {
        allNotes[existingIndex] = currentEditingNote;
      } else {
        allNotes.push(currentEditingNote);
      }

      renderNotes();
      currentEditingNote = null;
      showView("homeView");
    }
  } catch (error) {
    console.error("Error saving note:", error);
  }
}

async function deleteNote(noteId) {
  try {
    const result = await window.electron.notes.delete(noteId);
    if (result.success) {
      allNotes = allNotes.filter((n) => n.id !== noteId);
      renderNotes();
    }
  } catch (error) {
    console.error("Error deleting note:", error);
  }
}

const openCalendarBtn = document.getElementById("openCalendarBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");

if (openCalendarBtn) {
  openCalendarBtn.addEventListener("click", () => {
    showView("calendarView");
  });
}

if (backToHomeBtn) {
  backToHomeBtn.addEventListener("click", () => {
    showView("homeView");
  });
}

const backFromEditorBtn = document.getElementById("backFromEditorBtn");
const noteSaveBtn = document.getElementById("noteSaveBtn");
const newNoteBtn = document.getElementById("newNoteBtn");

if (backFromEditorBtn) {
  backFromEditorBtn.addEventListener("click", () => {
    currentEditingNote = null;
    showView("homeView");
  });
}

if (noteSaveBtn) {
  noteSaveBtn.addEventListener("click", () => {
    saveCurrentNote();
  });
}

if (newNoteBtn) {
  newNoteBtn.addEventListener("click", () => {
    createNewNote();
  });
}

showView("homeView");
updateCalendar();
loadNotesFromFiles();
