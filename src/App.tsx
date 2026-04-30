import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileArchive, FolderOpen, Moon, Sun, X } from "lucide-react";
import { BreakdownStage } from "./components/BreakdownStage";
import { EditorSidebar } from "./components/EditorSidebar";
import { ImageLibrarySidebar } from "./components/ImageLibrarySidebar";
import { registerEmbeddedFonts } from "./lib/fonts";
import { exportBreakdownDocument, importBreakdownDocument } from "./lib/projectArchive";
import { useProjectStore } from "./store/projectStore";

type Theme = "light" | "dark";
type BusyAction = "opening" | "saving";

const BUSY_MESSAGES: Record<BusyAction, string> = {
  opening: "Opening project...",
  saving: "Saving project...",
};

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [openedProjectFileName, setOpenedProjectFileName] = useState<string | null>(null);
  const [pngPreviewUrl, setPngPreviewUrl] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(1);
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

  useEffect(() => {
    function handlePreviewReady(event: Event) {
      const previewEvent = event as CustomEvent<{ dataUrl: string }>;
      setPngPreviewUrl(previewEvent.detail.dataUrl);
    }

    window.addEventListener("deck-breakdown-maker:png-preview-ready", handlePreviewReady);
    return () =>
      window.removeEventListener("deck-breakdown-maker:png-preview-ready", handlePreviewReady);
  }, []);

  useEffect(() => {
    if (!pngPreviewUrl) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPngPreviewUrl(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pngPreviewUrl]);

  async function handleSaveProject() {
    setBusyAction("saving");

    try {
      await waitForPaint();

      const blob = await exportBreakdownDocument({ project, assets });
      const downloadName = openedProjectFileName
        ? versionedProjectFileName(openedProjectFileName, saveVersion)
        : projectFileName(project.title.text);
      const link = document.createElement("a");
      link.download = downloadName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);

      if (openedProjectFileName) {
        setSaveVersion((currentVersion) => currentVersion + 1);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not save the project.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleOpenProject(file: File | undefined) {
    if (!file) {
      return;
    }

    setBusyAction("opening");

    try {
      await waitForPaint();

      const document = await importBreakdownDocument(await file.arrayBuffer());
      loadDocument(document);
      setOpenedProjectFileName(file.name);
      setSaveVersion(1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not open the project.");
    } finally {
      setBusyAction(null);
    }
  }

  function previewPng() {
    window.dispatchEvent(new CustomEvent("deck-breakdown-maker:preview-png"));
  }

  function downloadPreviewPng() {
    if (!pngPreviewUrl) {
      return;
    }

    const link = document.createElement("a");
    link.download = pngFileName(project.title.text);
    link.href = pngPreviewUrl;
    link.click();
  }

  return (
    <main className="app-shell" aria-busy={busyAction !== null}>
      <header className="topbar">
        <div>
          <h1>Deck Breakdown Maker</h1>
        </div>
        <div className="topbar-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".dhbreakdown,application/zip,application/vnd.dhbreakdown+zip"
            onChange={(event) => {
              void handleOpenProject(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            title="Open project"
            disabled={busyAction !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen size={18} />
          </button>
          <button
            type="button"
            title="Save project"
            disabled={busyAction !== null}
            onClick={handleSaveProject}
          >
            <FileArchive size={18} />
          </button>
          <button
            type="button"
            title="Preview PNG"
            disabled={busyAction !== null}
            onClick={previewPng}
          >
            <Eye size={18} />
          </button>
          <button type="button" title="Export PNG" disabled={busyAction !== null} onClick={exportPng}>
            <Download size={18} />
          </button>
          <button
            className="theme-toggle"
            type="button"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
            disabled={busyAction !== null}
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

      {busyAction ? (
        <div className="loading-backdrop" role="alert" aria-live="assertive">
          <div className="loading-dialog">
            <span className="loading-spinner" aria-hidden="true" />
            <p>{BUSY_MESSAGES[busyAction]}</p>
          </div>
        </div>
      ) : null}

      {pngPreviewUrl ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPngPreviewUrl(null);
            }
          }}
        >
          <section
            className="png-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="png-preview-title"
          >
            <header className="png-preview-header">
              <h2 id="png-preview-title">PNG preview</h2>
              <div className="dialog-actions">
                <button type="button" title="Download PNG" onClick={downloadPreviewPng}>
                  <Download size={17} />
                </button>
                <button type="button" title="Close preview" onClick={() => setPngPreviewUrl(null)}>
                  <X size={17} />
                </button>
              </div>
            </header>
            <div className="png-preview-body">
              <img src={pngPreviewUrl} alt="PNG export preview" />
            </div>
          </section>
        </div>
      ) : null}
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

function pngFileName(title: string) {
  return projectFileName(title).replace(/\.dhbreakdown$/, ".png");
}

function versionedProjectFileName(fileName: string, version: number) {
  const cleanName = fileName.trim() || "deck-breakdown.dhbreakdown";
  const extension = ".dhbreakdown";
  const baseName = cleanName.toLowerCase().endsWith(extension)
    ? cleanName.slice(0, -extension.length)
    : cleanName;
  const unversionedBaseName = baseName.replace(/_v\d+$/i, "");

  return `${unversionedBaseName}_v${version}${extension}`;
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}
