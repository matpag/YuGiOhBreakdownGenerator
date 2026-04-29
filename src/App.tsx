import { useEffect, useRef, useState } from "react";
import { Download, FileArchive, FolderOpen, Moon, Sun } from "lucide-react";
import { BreakdownStage } from "./components/BreakdownStage";
import { EditorSidebar } from "./components/EditorSidebar";
import { ImageLibrarySidebar } from "./components/ImageLibrarySidebar";
import { registerEmbeddedFonts } from "./lib/fonts";
import { exportBreakdownDocument, importBreakdownDocument } from "./lib/projectArchive";
import { useProjectStore } from "./store/projectStore";

type Theme = "light" | "dark";

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem("deck-breakdown-maker-theme") === "dark" ? "dark" : "light",
  );
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const loadDocument = useProjectStore((state) => state.loadDocument);
  const exportPng = useProjectStore((state) => state.exportPng);

  useEffect(() => {
    registerEmbeddedFonts(project.fonts, assets);
  }, [assets, project.fonts]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("deck-breakdown-maker-theme", theme);
  }, [theme]);

  async function handleSaveProject() {
    const blob = await exportBreakdownDocument({ project, assets });
    const link = document.createElement("a");
    link.download = projectFileName(project.title.text);
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function handleOpenProject(file: File | undefined) {
    if (!file) {
      return;
    }

    const document = await importBreakdownDocument(await file.arrayBuffer());
    loadDocument(document);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Deck Breakdown Maker</h1>
          <p>{project.title.text}</p>
        </div>
        <div className="topbar-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".dhbreakdown,application/zip,application/vnd.dhbreakdown+zip"
            onChange={(event) => {
              handleOpenProject(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button type="button" title="Open project" onClick={() => fileInputRef.current?.click()}>
            <FolderOpen size={18} />
          </button>
          <button type="button" title="Save project" onClick={handleSaveProject}>
            <FileArchive size={18} />
          </button>
          <button type="button" title="Export PNG" onClick={exportPng}>
            <Download size={18} />
          </button>
          <button
            className="theme-toggle"
            type="button"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      <section className="workspace">
        <EditorSidebar />
        <BreakdownStage />
        <ImageLibrarySidebar />
      </section>
    </main>
  );
}

function projectFileName(title: string) {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "deck-breakdown";

  return `${slug}.dhbreakdown`;
}
