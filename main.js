const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Persistent storage locations under Electron userData
const notesDir = path.join(app.getPath("userData"), "notes");
const drawingsDir = path.join(app.getPath("userData"), "drawings");

// Creates storage directories if missing
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Drawings are named as: encodedTitle__id.png
// This parser reconstructs metadata for list rendering
function parseDrawingFileName(fileName) {
  const match = fileName.match(/^(.*)__([a-zA-Z0-9_-]+)\.png$/);
  if (!match) {
    return null;
  }

  let decodedTitle = "Untitled Drawing";
  try {
    decodedTitle = decodeURIComponent(match[1]);
  } catch {
    decodedTitle = "Untitled Drawing";
  }

  return {
    id: match[2],
    title: decodedTitle || "Untitled Drawing",
  };
}

// Encodes title safely for filenames and appends unique id
function makeDrawingFileName(id, title) {
  const safeTitle = encodeURIComponent((title || "Untitled Drawing").trim());
  return `${safeTitle || "Untitled%20Drawing"}__${id}.png`;
}

// Finds the current drawing file by id (useful for rename updates)
function findDrawingFileById(id) {
  const files = fs.readdirSync(drawingsDir);
  return files.find((file) => file.endsWith(`__${id}.png`)) || null;
}

ensureDir(notesDir);
ensureDir(drawingsDir);

// Creates the frameless Electron window for the renderer app
function createWindow() {
  const win = new BrowserWindow({
    title: "My note taking app",
    width: 214,
    height: 228,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    background: "#00000000",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
}

// -------------------- Notes IPC --------------------
ipcMain.handle("notes:loadAll", async () => {
  try {
    const files = fs.readdirSync(notesDir);
    const notes = [];

    files.forEach((file) => {
      if (file.endsWith(".txt")) {
        const filePath = path.join(notesDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        const title = lines[0] || "Untitled";
        const noteContent = lines.slice(1).join("\n");

        notes.push({
          id: file.replace(".txt", ""),
          title: title,
          content: noteContent,
        });
      }
    });

    return notes;
  } catch (error) {
    console.error("Error loading notes:", error);
    return [];
  }
});

ipcMain.handle("notes:save", async (event, note) => {
  try {
    const fileName = note.id + ".txt";
    const filePath = path.join(notesDir, fileName);
    const content = note.title + "\n" + note.content;

    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true, id: note.id };
  } catch (error) {
    console.error("Error saving note:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("notes:delete", async (event, id) => {
  try {
    const fileName = id + ".txt";
    const filePath = path.join(notesDir, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: "File not found" };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: error.message };
  }
});

// -------------------- Drawings IPC --------------------
ipcMain.handle("drawings:loadAll", async () => {
  try {
    const files = fs.readdirSync(drawingsDir);
    const drawings = [];

    files.forEach((file) => {
      if (!file.endsWith(".png")) {
        return;
      }

      const parsed = parseDrawingFileName(file);
      if (!parsed) {
        return;
      }

      const imagePath = path.join(drawingsDir, file);
      const fileBuffer = fs.readFileSync(imagePath);
      const dataUrl = `data:image/png;base64,${fileBuffer.toString("base64")}`;

      drawings.push({
        id: parsed.id,
        title: parsed.title,
        imageDataUrl: dataUrl,
      });
    });

    return drawings;
  } catch (error) {
    console.error("Error loading drawings:", error);
    return [];
  }
});

ipcMain.handle("drawings:save", async (event, drawing) => {
  try {
    const { id, title, imageDataUrl } = drawing || {};

    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return { success: false, error: "Invalid drawing id" };
    }

    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/png;base64,")) {
      return { success: false, error: "Invalid drawing image" };
    }

    const oldFileName = findDrawingFileById(id);
    const nextFileName = makeDrawingFileName(id, title || "Untitled Drawing");
    const outputPath = path.join(drawingsDir, nextFileName);

    // Renderer sends PNG as data URL; write binary payload to disk
    const base64Payload = imageDataUrl.split(",")[1] || "";
    fs.writeFileSync(outputPath, Buffer.from(base64Payload, "base64"));

    if (oldFileName && oldFileName !== nextFileName) {
      fs.unlinkSync(path.join(drawingsDir, oldFileName));
    }

    return { success: true, id };
  } catch (error) {
    console.error("Error saving drawing:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("drawings:delete", async (event, id) => {
  try {
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return { success: false, error: "Invalid drawing id" };
    }

    const fileName = findDrawingFileById(id);
    if (!fileName) {
      return { success: false, error: "File not found" };
    }

    fs.unlinkSync(path.join(drawingsDir, fileName));
    return { success: true };
  } catch (error) {
    console.error("Error deleting drawing:", error);
    return { success: false, error: error.message };
  }
});

// App lifecycle bootstrapping
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
