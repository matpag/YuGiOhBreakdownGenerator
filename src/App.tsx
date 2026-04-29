import { useEffect, useRef } from "react";
import { Download, FileArchive, FolderOpen } from "lucide-react";
import { BreakdownStage } from "./components/BreakdownStage";
import { EditorSidebar } from "./components/EditorSidebar";
import { registerEmbeddedFonts } from "./lib/fonts";
import { exportBreakdownDocument, importBreakdownDocument } from "./lib/projectArchive";
import { useProjectStore } from "./store/projectStore";

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const loadDocument = useProjectStore((state) => state.loadDocument);
  const exportPng = useProjectStore((state) => state.exportPng);

  useEffect(() => {
    registerEmbeddedFonts(project.fonts, assets);
  }, [assets, project.fonts]);

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
          <h1>Graphic Templater</h1>
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
        </div>
      </header>

      <section className="workspace">
        <EditorSidebar />
        <BreakdownStage />
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
