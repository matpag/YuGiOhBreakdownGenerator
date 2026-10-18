import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Eye, FolderOpen, Moon, Save, SaveAll, Sun, X } from "lucide-react";
import { BreakdownStage } from "./components/BreakdownStage";
import { EditorSidebar } from "./components/EditorSidebar";
import { ImageLibrarySidebar } from "./components/ImageLibrarySidebar";
import { registerEmbeddedFonts } from "./lib/fonts";
import {
  BREAKDOWN_ARCHIVE_MIME_TYPE,
  exportBreakdownDocument,
  importBreakdownDocument,
} from "./lib/projectArchive";
import { useProjectStore } from "./store/projectStore";
import { LanguageSelect, useI18n, type TranslationKey, type UiMessage } from "./i18n/I18nProvider";
import { describeUiError } from "./i18n/errors";

type Theme = "light" | "dark";
type BusyAction = "opening" | "saving";
type Notice = {
  id: number;
  message: UiMessage;
};

const BUSY_MESSAGES: Record<BusyAction, TranslationKey> = {
  opening: "opening",
  saving: "saving",
};
const PROJECT_FILE_EXTENSION = ".dhbreakdown";
const projectFilePickerTypes = (description: string) => [
  {
    description,
    accept: {
      [BREAKDOWN_ARCHIVE_MIME_TYPE]: [PROJECT_FILE_EXTENSION],
      "application/zip": [PROJECT_FILE_EXTENSION],
    },
  },
];

export default function App() {
  const { t, message: renderMessage, suiteUrl } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [openedProjectFileName, setOpenedProjectFileName] = useState<string | null>(null);
  const [pngPreviewUrl, setPngPreviewUrl] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(1);
  const [theme, setTheme] = useState<Theme>(() => {
    try { return window.localStorage.getItem("deck-breakdown-maker-theme") === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const loadDocument = useProjectStore((state) => state.loadDocument);
  const exportPng = useProjectStore((state) => state.exportPng);

  useEffect(() => {
    registerEmbeddedFonts(project.fonts, assets).catch((error) => showNotice(describeUiError(error, "readFontError")));
  }, [assets, project.fonts]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("deck-breakdown-maker-theme", theme); } catch { /* Keep theme usable without storage. */ }
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

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function showNotice(message: UiMessage) {
    setNotice({ id: Date.now(), message });
  }

  async function handleSaveProject() {
    setBusyAction("saving");

    try {
      await waitForPaint();

      const blob = await exportBreakdownDocument({ project, assets });

      if (fileHandle) {
        await writeProjectFile(fileHandle, blob);
        return;
      }

      await saveProjectAs(blob);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      window.alert(renderMessage(describeUiError(error, "saveProjectError")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveProjectAs() {
    setBusyAction("saving");

    try {
      await waitForPaint();

      const blob = await exportBreakdownDocument({ project, assets });
      await saveProjectAs(blob);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      window.alert(renderMessage(describeUiError(error, "saveProjectError")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleOpenProjectPicker() {
    if (!supportsFileSystemAccess()) {
      fileInputRef.current?.click();
      return;
    }

    setBusyAction("opening");

    try {
      await waitForPaint();

      const [handle] = await window.showOpenFilePicker!({
        excludeAcceptAllOption: false,
        multiple: false,
        types: projectFilePickerTypes(t("projectFileType")),
      });

      if (!handle) {
        return;
      }

      const file = await handle.getFile();
      await openProjectFile(file, handle);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      window.alert(renderMessage(describeUiError(error, "openProjectError")));
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

      await openProjectFile(file, null);
    } catch (error) {
      window.alert(renderMessage(describeUiError(error, "openProjectError")));
    } finally {
      setBusyAction(null);
    }
  }

  async function openProjectFile(file: File, handle: FileSystemFileHandle | null) {
    const document = await importBreakdownDocument(await file.arrayBuffer());

    loadDocument(document);
    setFileHandle(handle);
    setOpenedProjectFileName(file.name);
    setSaveVersion(1);
  }

  async function saveProjectAs(blob: Blob) {
    if (supportsFileSystemAccess()) {
      const handle = await window.showSaveFilePicker!({
        excludeAcceptAllOption: false,
        suggestedName: openedProjectFileName ?? projectFileName(project.title.text),
        types: projectFilePickerTypes(t("projectFileType")),
      });

      await writeProjectFile(handle, blob);
      setFileHandle(handle);
      setOpenedProjectFileName(handle.name);
      setSaveVersion(1);
      return;
    }

    showNotice({ key: "noticeDownload" });
    downloadProjectBlob(blob);
  }

  function downloadProjectBlob(blob: Blob) {
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
      <header className="topbar rf-suite-header rf-suite-header--compact">
        <a className="rf-brand" href={suiteUrl("https://retroformats.com/")} aria-label={t("home")}>
          <img
            className="rf-brand__mark"
            src={`${import.meta.env.BASE_URL}retroformats/retroformats-mark.svg`}
            alt=""
            aria-hidden="true"
          />
          <span>
            retroformats<span className="rf-brand__dot">.</span>
            <span className="rf-brand__product">{t("appName")}</span>
          </span>
        </a>
        {openedProjectFileName ? (
          <div className="open-file-status" title={openedProjectFileName}>
            <span>{t("template")}</span>
            <strong>{openedProjectFileName}</strong>
            {fileHandle ? <small>{t("directSave")}</small> : <small>{t("downloadSave")}</small>}
          </div>
        ) : null}
        <div className="topbar-actions rf-suite-actions project-toolbar" role="group" aria-label={t("projectActions")}>
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
            title={t("openTemplate")}
            aria-label={t("openTemplate")}
            disabled={busyAction !== null}
            onClick={handleOpenProjectPicker}
          >
            <FolderOpen size={18} />
          </button>
          <button
            type="button"
            title={t(fileHandle ? "saveOpened" : "saveNew")}
            aria-label={t(fileHandle ? "saveOpened" : "saveNew")}
            disabled={busyAction !== null}
            onClick={handleSaveProject}
          >
            <Save size={18} />
          </button>
          <button
            type="button"
            title={t("saveAs")}
            aria-label={t("saveAs")}
            disabled={busyAction !== null}
            onClick={handleSaveProjectAs}
          >
            <SaveAll size={18} />
            {t("saveAsShort")}
          </button>
          <span className="toolbar-separator" aria-hidden="true" />
          <button
            type="button"
            title={t("previewPng")}
            aria-label={t("previewPng")}
            disabled={busyAction !== null}
            onClick={previewPng}
          >
            <Eye size={18} />
          </button>
          <button className="rf-action-primary" type="button" title={t("exportPng")} disabled={busyAction !== null} onClick={exportPng}>
            <Download size={18} />
            <span>{t("exportPng")}</span>
          </button>
          <span className="toolbar-separator" aria-hidden="true" />
          <button
            className="theme-toggle"
            type="button"
            title={t(theme === "dark" ? "switchLight" : "switchDark")}
            aria-label={t(theme === "dark" ? "switchLight" : "switchDark")}
            aria-pressed={theme === "dark"}
            disabled={busyAction !== null}
            onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{t(theme === "dark" ? "light" : "dark")}</span>
          </button>
          <LanguageSelect />
          <details className="rf-suite-switcher">
            <summary>{t("suiteTools")} <ChevronDown aria-hidden="true" size={14} /></summary>
            <nav className="rf-suite-nav" aria-label={t("suiteNav")}>
              <a href={suiteUrl("https://retroformats.com/")}>{t("home")}</a>
              <a href={suiteUrl("https://retroformats.com/probability/")}>{t("probabilityApp")}</a>
              <a href={suiteUrl("https://retroformats.com/proxy/")}>{t("proxyApp")}</a>
              <a href={suiteUrl("https://retroformats.com/decklist/")}>{t("decklistApp")}</a>
              <a href={suiteUrl("https://retroformats.com/breakdown/")} aria-current="page">{t("appName")}</a>
            </nav>
          </details>
        </div>
      </header>

      <h1 className="visually-hidden">{t("appName")}</h1>
      <section className="workspace">
        <EditorSidebar />
        <BreakdownStage theme={theme} />
        <ImageLibrarySidebar />
      </section>

      {busyAction ? (
        <div className="loading-backdrop" role="alert" aria-live="assertive">
          <div className="loading-dialog">
            <span className="loading-spinner" aria-hidden="true" />
            <p>{t(BUSY_MESSAGES[busyAction])}</p>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="app-notice" role="status" aria-live="polite">
          {renderMessage(notice.message)}
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
              <h2 id="png-preview-title">{t("pngPreview")}</h2>
              <div className="dialog-actions">
                <button className="rf-action-primary" type="button" title={t("downloadPng")} aria-label={t("downloadPng")} onClick={downloadPreviewPng}>
                  <Download size={17} />
                  {t("downloadPng")}
                </button>
                <button type="button" title={t("closePreview")} aria-label={t("closePreview")} onClick={() => setPngPreviewUrl(null)}>
                  <X size={17} />
                </button>
              </div>
            </header>
            <div className="png-preview-body">
              <img src={pngPreviewUrl} alt={t("pngPreviewAlt")} />
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

function supportsFileSystemAccess() {
  return "showOpenFilePicker" in window && "showSaveFilePicker" in window;
}

async function writeProjectFile(handle: FileSystemFileHandle, blob: Blob) {
  const writable = await handle.createWritable();

  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
