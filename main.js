const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const notesDir = path.join(app.getPath("userData"), "notes");

if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir, { recursive: true });
}

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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
