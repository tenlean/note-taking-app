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
  const views = [
    "homeView",
    "calendarView",
    "noteEditorView",
    "drawingView",
    "drawingEditorView",
  ];

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
let allDrawings = [];
let currentEditingDrawing = null;

const DRAW_BRUSH_SIZE = 3;
let drawingCanvas = null;
let drawingCtx = null;
let isDrawing = false;

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

async function loadDrawingsFromFiles() {
  try {
    allDrawings = await window.electron.drawings.loadAll();
    renderDrawings();
  } catch (error) {
    console.error("Error loading drawings:", error);
  }
}

function renderDrawings() {
  const drawingsList = document.getElementById("drawingsList");
  if (!drawingsList) {
    return;
  }

  drawingsList.textContent = "";

  if (allDrawings.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notes-empty";
    empty.textContent = "No drawings yet";
    drawingsList.appendChild(empty);
    return;
  }

  allDrawings.forEach((drawing) => {
    const row = document.createElement("div");
    row.className = "note-item";

    const openBtn = document.createElement("button");
    openBtn.className = "drawing-open-btn";
    openBtn.type = "button";
    openBtn.textContent = drawing.title || "Untitled Drawing";
    openBtn.addEventListener("click", () => {
      openDrawingEditor(drawing.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "drawing-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "x";
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteDrawing(drawing.id);
    });

    row.appendChild(openBtn);
    row.appendChild(deleteBtn);
    drawingsList.appendChild(row);
  });
}

function initDrawingCanvas() {
  drawingCanvas = document.getElementById("drawingCanvas");
  if (!drawingCanvas) {
    return;
  }

  drawingCtx = drawingCanvas.getContext("2d");
  drawingCtx.lineCap = "round";
  drawingCtx.lineJoin = "round";
  drawingCtx.strokeStyle = "#000000";
  drawingCtx.lineWidth = DRAW_BRUSH_SIZE;

  clearDrawingCanvas();

  drawingCanvas.addEventListener("pointerdown", (event) => {
    isDrawing = true;
    const point = getCanvasPoint(event);
    drawingCtx.beginPath();
    drawingCtx.moveTo(point.x, point.y);
  });

  drawingCanvas.addEventListener("pointermove", (event) => {
    if (!isDrawing) {
      return;
    }

    const point = getCanvasPoint(event);
    drawingCtx.lineTo(point.x, point.y);
    drawingCtx.stroke();
  });

  const stopDrawing = () => {
    isDrawing = false;
  };

  drawingCanvas.addEventListener("pointerup", stopDrawing);
  drawingCanvas.addEventListener("pointerleave", stopDrawing);
}

function getCanvasPoint(event) {
  const rect = drawingCanvas.getBoundingClientRect();
  const scaleX = drawingCanvas.width / rect.width;
  const scaleY = drawingCanvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function clearDrawingCanvas() {
  if (!drawingCtx || !drawingCanvas) {
    return;
  }

  drawingCtx.fillStyle = "#ffffff";
  drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}

function loadDrawingToCanvas(dataUrl) {
  return new Promise((resolve) => {
    if (!drawingCtx || !drawingCanvas || !dataUrl) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      clearDrawingCanvas();
      drawingCtx.drawImage(
        img,
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height,
      );
      resolve();
    };
    img.onerror = () => resolve();
    img.src = dataUrl;
  });
}

function createNewDrawing() {
  currentEditingDrawing = {
    id: "drawing-" + Date.now(),
    title: "New Drawing",
    imageDataUrl: "",
  };

  document.getElementById("drawingTitleInput").value = "New Drawing";
  clearDrawingCanvas();
  showView("drawingEditorView");
}

async function openDrawingEditor(drawingId) {
  const drawing = allDrawings.find((item) => item.id === drawingId);
  if (!drawing) {
    return;
  }

  currentEditingDrawing = {
    id: drawing.id,
    title: drawing.title,
    imageDataUrl: drawing.imageDataUrl,
  };

  document.getElementById("drawingTitleInput").value =
    drawing.title || "Untitled Drawing";
  showView("drawingEditorView");
  await loadDrawingToCanvas(drawing.imageDataUrl);
}

async function saveCurrentDrawing() {
  if (!currentEditingDrawing || !drawingCanvas) {
    return;
  }

  const titleInput = document.getElementById("drawingTitleInput");
  const title = (titleInput.value || "Untitled Drawing").trim();
  const imageDataUrl = drawingCanvas.toDataURL("image/png");

  const drawingToSave = {
    id: currentEditingDrawing.id,
    title,
    imageDataUrl,
  };

  try {
    const result = await window.electron.drawings.save(drawingToSave);
    if (!result.success) {
      return;
    }

    const existingIndex = allDrawings.findIndex(
      (item) => item.id === drawingToSave.id,
    );

    if (existingIndex >= 0) {
      allDrawings[existingIndex] = drawingToSave;
    } else {
      allDrawings.push(drawingToSave);
    }

    renderDrawings();
    currentEditingDrawing = null;
    showView("drawingView");
  } catch (error) {
    console.error("Error saving drawing:", error);
  }
}

async function deleteDrawing(drawingId) {
  try {
    const result = await window.electron.drawings.delete(drawingId);
    if (!result.success) {
      return;
    }

    allDrawings = allDrawings.filter((item) => item.id !== drawingId);
    renderDrawings();
  } catch (error) {
    console.error("Error deleting drawing:", error);
  }
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
const openDrawingsBtn = document.getElementById("openDrawingsBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");

if (openCalendarBtn) {
  openCalendarBtn.addEventListener("click", () => {
    showView("calendarView");
  });
}

if (openDrawingsBtn) {
  openDrawingsBtn.addEventListener("click", () => {
    showView("drawingView");
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
const backFromDrawingsBtn = document.getElementById("backFromDrawingsBtn");
const newDrawingBtn = document.getElementById("newDrawingBtn");
const backFromDrawingEditorBtn = document.getElementById(
  "backFromDrawingEditorBtn",
);
const drawingSaveBtn = document.getElementById("drawingSaveBtn");
const drawingClearBtn = document.getElementById("drawingClearBtn");

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

if (backFromDrawingsBtn) {
  backFromDrawingsBtn.addEventListener("click", () => {
    showView("homeView");
  });
}

if (newDrawingBtn) {
  newDrawingBtn.addEventListener("click", () => {
    createNewDrawing();
  });
}

if (backFromDrawingEditorBtn) {
  backFromDrawingEditorBtn.addEventListener("click", () => {
    currentEditingDrawing = null;
    showView("drawingView");
  });
}

if (drawingSaveBtn) {
  drawingSaveBtn.addEventListener("click", () => {
    saveCurrentDrawing();
  });
}

if (drawingClearBtn) {
  drawingClearBtn.addEventListener("click", () => {
    clearDrawingCanvas();
  });
}

initDrawingCanvas();
showView("homeView");
updateCalendar();
loadNotesFromFiles();
loadDrawingsFromFiles();
