import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { fileToAsset, remoteImageToAsset, validateImageFile } from "../lib/assets";
import { useGuideSection } from "../lib/useGuideSection";
import { useProjectStore } from "../store/projectStore";
import { useI18n, type UiMessage } from "../i18n/I18nProvider";
import { describeUiError } from "../i18n/errors";
import type { ProjectAsset } from "../types/project";

const DEVIANT_ART_USERNAME = "nhociory";
const DEVIANT_ART_BASE_SEARCH_URL = `https://www.deviantart.com/${DEVIANT_ART_USERNAME}/gallery?q=`;
const DEVIANT_ART_RSS_URL = "https://backend.deviantart.com/rss.xml";
const IMAGE_SEARCH_RESULTS_PER_PAGE = 10;

interface ArtworkSearchResult {
  id: string;
  imageUrl: string;
  link: string;
  previewUrl: string;
  title: string;
}

interface PendingImageLibraryItem {
  id: string;
  asset: ProjectAsset;
  sourceArtworkId?: string;
}

export function ImageLibrarySidebar() {
  const { t, message } = useI18n();
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const addAsset = useProjectStore((state) => state.addAsset);
  const addImageLibraryItem = useProjectStore((state) => state.addImageLibraryItem);
  const renameImageLibraryItem = useProjectStore((state) => state.renameImageLibraryItem);
  const removeImageLibraryItem = useProjectStore((state) => state.removeImageLibraryItem);
  const setSliceAsset = useProjectStore((state) => state.setSliceAsset);
  const [collapsed, setCollapsed] = useState(false);
  useGuideSection("images", setCollapsed);
  const [artworkSearchQuery, setArtworkSearchQuery] = useState("");
  const [artworkSearchResults, setArtworkSearchResults] = useState<ArtworkSearchResult[]>([]);
  const [artworkSearchPage, setArtworkSearchPage] = useState(0);
  const [artworkSearchStatus, setArtworkSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [artworkSearchError, setArtworkSearchError] = useState<UiMessage | null>(null);
  const [addingArtworkId, setAddingArtworkId] = useState<string | null>(null);
  const [addedArtworkIds, setAddedArtworkIds] = useState<Set<string>>(() => new Set());
  const [imageUploadError, setImageUploadError] = useState<UiMessage | null>(null);
  const [imageLibrarySearch, setImageLibrarySearch] = useState("");
  const [renameDialogItemId, setRenameDialogItemId] = useState<string | null>(null);
  const [renameDialogName, setRenameDialogName] = useState("");
  const [pendingImageAdd, setPendingImageAdd] = useState<{
    active: PendingImageLibraryItem | null;
    queue: PendingImageLibraryItem[];
  }>({ active: null, queue: [] });
  const [pendingImageName, setPendingImageName] = useState("");
  const selectedSlice =
    project.pieChart.slices.find((slice) => slice.id === project.pieChart.selectedSliceId) ?? null;
  const renameDialogItem =
    project.imageLibrary.find((item) => item.id === renameDialogItemId) ?? null;
  const normalizedImageLibrarySearch = imageLibrarySearch.trim().toLowerCase();
  const filteredImageLibrary = project.imageLibrary.filter((item) => {
    if (!normalizedImageLibrarySearch) {
      return true;
    }

    const asset = assets[item.assetId];
    return [item.name, asset?.name ?? ""].some((name) =>
      name.toLowerCase().includes(normalizedImageLibrarySearch),
    );
  });
  const artworkSearchUrl = `${DEVIANT_ART_BASE_SEARCH_URL}${formatDeviantArtQuery(
    artworkSearchQuery,
  )}`;
  const pendingImage = pendingImageAdd.active;
  const artworkSearchPageCount = Math.max(
    1,
    Math.ceil(artworkSearchResults.length / IMAGE_SEARCH_RESULTS_PER_PAGE),
  );
  const artworkSearchPageStart = artworkSearchPage * IMAGE_SEARCH_RESULTS_PER_PAGE;
  const pagedArtworkSearchResults = artworkSearchResults.slice(
    artworkSearchPageStart,
    artworkSearchPageStart + IMAGE_SEARCH_RESULTS_PER_PAGE,
  );

  useEffect(() => {
    if (pendingImage) {
      setPendingImageName(pendingImage.asset.name);
    }
  }, [pendingImage?.id]);

  async function handleLibraryUpload(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) {
      return;
    }

    const errors = files.map(validateImageFile).filter((error): error is string => error !== null);

    if (errors.length > 0) {
      setImageUploadError(describeUiError(errors[0], "readImageError"));
      return;
    }

    setImageUploadError(null);

    try {
      for (const file of files) {
        const asset = await fileToAsset(file);

        enqueueImageLibraryAsset(asset);
      }
    } catch (error) {
      setImageUploadError(describeUiError(error, "readImageError"));
    }
  }

  function enqueueImageLibraryAsset(asset: ProjectAsset, sourceArtworkId?: string) {
    const pendingItem: PendingImageLibraryItem = {
      id: crypto.randomUUID(),
      asset,
      sourceArtworkId,
    };

    setPendingImageAdd((state) => {
      if (state.active) {
        return {
          ...state,
          queue: [...state.queue, pendingItem],
        };
      }

      return {
        active: pendingItem,
        queue: state.queue,
      };
    });
  }

  function advancePendingImageDialog() {
    setPendingImageAdd((state) => ({
      active: state.queue[0] ?? null,
      queue: state.queue.slice(1),
    }));
  }

  function cancelPendingImageDialog() {
    const sourceArtworkId = pendingImage?.sourceArtworkId;

    if (sourceArtworkId) {
      setAddedArtworkIds((ids) => {
        const nextIds = new Set(ids);

        nextIds.delete(sourceArtworkId);
        return nextIds;
      });
    }

    advancePendingImageDialog();
  }

  function commitPendingImageDialog() {
    const nextName = pendingImageName.trim();

    if (!pendingImage || !nextName) {
      return;
    }

    const assetId = addAsset({
      ...pendingImage.asset,
      name: nextName,
    });

    addImageLibraryItem({
      id: crypto.randomUUID(),
      assetId,
      name: nextName,
      createdAt: new Date().toISOString(),
    });

    advancePendingImageDialog();
  }

  function startRenaming(itemId: string, name: string) {
    setRenameDialogItemId(itemId);
    setRenameDialogName(name);
  }

  function cancelRenaming() {
    setRenameDialogItemId(null);
    setRenameDialogName("");
  }

  function commitRename(itemId: string) {
    const nextName = renameDialogName.trim();

    if (!nextName) {
      return;
    }

    renameImageLibraryItem(itemId, nextName);
    cancelRenaming();
  }

  async function searchArtwork() {
    const query = artworkSearchQuery.trim();

    if (!query) {
      setArtworkSearchStatus("idle");
      setArtworkSearchResults([]);
      setArtworkSearchPage(0);
      setArtworkSearchError(null);
      return;
    }

    setArtworkSearchStatus("loading");
    setArtworkSearchError(null);

    try {
      const results = await fetchArtworkSearchResults(query);

      setArtworkSearchResults(results);
      setArtworkSearchPage(0);
      setArtworkSearchStatus("ready");
    } catch (error) {
      setArtworkSearchResults([]);
      setArtworkSearchPage(0);
      setArtworkSearchStatus("error");
      setArtworkSearchError(describeUiError(error, "imageSearchError"));
    }
  }

  function clearArtworkSearch() {
    setArtworkSearchQuery("");
    setArtworkSearchResults([]);
    setArtworkSearchPage(0);
    setArtworkSearchStatus("idle");
    setArtworkSearchError(null);
  }

  async function addArtworkResult(result: ArtworkSearchResult) {
    if (addedArtworkIds.has(result.id)) {
      return;
    }

    setAddedArtworkIds((ids) => new Set(ids).add(result.id));
    setAddingArtworkId(result.id);
    setArtworkSearchError(null);

    try {
      const asset = await remoteImageToAsset(result.imageUrl, result.title);

      enqueueImageLibraryAsset(asset, result.id);
    } catch (error) {
      setAddedArtworkIds((ids) => {
        const nextIds = new Set(ids);

        nextIds.delete(result.id);
        return nextIds;
      });
      setArtworkSearchError(describeUiError(error, "addArtworkError"));
    } finally {
      setAddingArtworkId(null);
    }
  }

  return (
    <aside className={`library-sidebar ${collapsed ? "library-sidebar-collapsed" : ""}`}>
      <button
        className="library-collapse-button"
        type="button"
        title={t(collapsed ? "openLibrary" : "closeLibrary")}
        aria-label={t(collapsed ? "openLibrary" : "closeLibrary")}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((isCollapsed) => !isCollapsed)}
      >
        {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
      </button>

      {collapsed ? null : (
        <div className="library-content-stack">
          <section className="panel image-searcher-panel">
            <h2>{t("imageSearch")}</h2>
            <form
              className="image-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                searchArtwork();
              }}
            >
              <label>
                {t("cardName")}
                <input
                  type="search"
                  placeholder={t("cardExample")}
                  value={artworkSearchQuery}
                  onChange={(event) => setArtworkSearchQuery(event.target.value)}
                />
              </label>
              <button type="submit" disabled={artworkSearchStatus === "loading"}>
                <Search size={16} />
                {t(artworkSearchStatus === "loading" ? "searching" : "search")}
              </button>
              <button
                className="icon-button image-search-clear-button"
                type="button"
                title={t("clearImageSearch")}
                disabled={
                  !artworkSearchQuery &&
                  artworkSearchResults.length === 0 &&
                  !artworkSearchError
                }
                onClick={clearArtworkSearch}
              >
                <X size={16} />
              </button>
            </form>
            {artworkSearchQuery.trim() ? (
              <a className="image-search-source" href={artworkSearchUrl} target="_blank" rel="noreferrer">
                {t("openDeviantArt")}
              </a>
            ) : null}
            {artworkSearchError ? <p className="field-error">{message(artworkSearchError)}</p> : null}
            {artworkSearchResults.length > IMAGE_SEARCH_RESULTS_PER_PAGE ? (
              <div className="image-search-pagination">
                <button
                  className="icon-button"
                  type="button"
                  title={t("previousSearchPage")}
                  disabled={artworkSearchPage === 0}
                  onClick={() => setArtworkSearchPage((page) => Math.max(0, page - 1))}
                >
                  <ChevronLeft size={15} />
                </button>
                <span>
                  {t("searchRange", {
                    first: artworkSearchPageStart + 1,
                    last: Math.min(artworkSearchPageStart + IMAGE_SEARCH_RESULTS_PER_PAGE, artworkSearchResults.length),
                    total: artworkSearchResults.length,
                  })}
                </span>
                <button
                  className="icon-button"
                  type="button"
                  title={t("nextSearchPage")}
                  disabled={artworkSearchPage >= artworkSearchPageCount - 1}
                  onClick={() =>
                    setArtworkSearchPage((page) => Math.min(artworkSearchPageCount - 1, page + 1))
                  }
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : null}
            <div className="image-search-results">
              {pagedArtworkSearchResults.map((result) => {
                const isAddingArtwork = addingArtworkId === result.id;
                const isArtworkAdded = addedArtworkIds.has(result.id);

                return (
                  <article className="image-search-result" key={result.id}>
                    <a href={result.link} target="_blank" rel="noreferrer">
                      <img alt={result.title} src={result.previewUrl} />
                    </a>
                    <div className="image-search-result-body">
                      <strong title={result.title}>{result.title}</strong>
                      <button
                        type="button"
                        disabled={isArtworkAdded}
                        onClick={() => addArtworkResult(result)}
                      >
                        <ImagePlus size={15} />
                        {isAddingArtwork
                          ? t("adding")
                          : isArtworkAdded
                            ? t("added")
                            : t("addToLibrary")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {artworkSearchStatus === "ready" && artworkSearchResults.length === 0 ? (
              <p className="empty-state">{t("noArtworkResults")}</p>
            ) : null}
          </section>

          <section className="panel library-panel" data-guide-section="images">
            <div className="panel-heading-row">
              <h2 tabIndex={-1}>{t("imageLibrary")}</h2>
              <label className="file-button">
                <ImagePlus size={16} />
                {t("add")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    handleLibraryUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {imageUploadError ? <p className="field-error">{message(imageUploadError)}</p> : null}
            <label>
              {t("search")}
              <input
                type="search"
                placeholder={t("findImage")}
                value={imageLibrarySearch}
                onChange={(event) => setImageLibrarySearch(event.target.value)}
              />
            </label>
            <div className="asset-grid">
              {filteredImageLibrary.map((item) => {
                const asset = assets[item.assetId];

                if (!asset) {
                  return null;
                }

                return (
                  <article className="asset-card" key={item.id}>
                    <img alt={item.name} src={asset.dataUrl} />
                    <div className="asset-card-body">
                      <div className="asset-card-title-row">
                        <strong title={item.name}>{item.name}</strong>
                        <button
                          className="icon-button"
                          type="button"
                          title={t("renameImage")}
                          onClick={() => startRenaming(item.id, item.name)}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                      <div className="asset-card-actions">
                        <button
                          type="button"
                          title={t("useOnSlice")}
                          disabled={!selectedSlice}
                          onClick={() => {
                            if (selectedSlice) {
                              setSliceAsset(selectedSlice.id, item.assetId);
                            }
                          }}
                        >
                          {t("slice")}
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          title={t("removeLibrary")}
                          onClick={() => removeImageLibraryItem(item.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {filteredImageLibrary.length === 0 ? (
              <p className="empty-state">{t("noImageResults")}</p>
            ) : null}
          </section>
        </div>
      )}

      {renameDialogItem ? (
        <div
          aria-modal="true"
          className="dialog-backdrop"
          role="dialog"
          aria-labelledby="rename-image-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelRenaming();
            }
          }}
        >
          <form
            className="rename-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              commitRename(renameDialogItem.id);
            }}
          >
            <h2 id="rename-image-title">{t("renameImage")}</h2>
            <label>
              {t("imageName")}
              <input
                autoFocus
                value={renameDialogName}
                onChange={(event) => setRenameDialogName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelRenaming();
                  }
                }}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={cancelRenaming}>
                {t("cancel")}
              </button>
              <button type="submit" disabled={!renameDialogName.trim()}>
                {t("save")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingImage ? (
        <div
          aria-modal="true"
          className="dialog-backdrop"
          role="dialog"
          aria-labelledby="name-image-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelPendingImageDialog();
            }
          }}
        >
          <form
            className="rename-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              commitPendingImageDialog();
            }}
          >
            <h2 id="name-image-title">{t("nameImage")}</h2>
            <label>
              {t("imageName")}
              <input
                autoFocus
                value={pendingImageName}
                onChange={(event) => setPendingImageName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelPendingImageDialog();
                  }
                }}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={cancelPendingImageDialog}>
                {t("cancel")}
              </button>
              <button type="submit" disabled={!pendingImageName.trim()}>
                {t("add")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </aside>
  );
}

async function fetchArtworkSearchResults(query: string): Promise<ArtworkSearchResult[]> {
  const searchTerms = searchTermsFromQuery(query);
  const params = new URLSearchParams({
    type: "deviation",
    q: `${query} ${DEVIANT_ART_USERNAME} Artwork`,
  });
  const response = await fetch(`${DEVIANT_ART_RSS_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`DeviantArt search failed with status ${response.status}.`);
  }

  const document = new DOMParser().parseFromString(await response.text(), "application/xml");
  const parseError = document.querySelector("parsererror");

  if (parseError) {
    throw new Error("DeviantArt returned an unreadable search response.");
  }

  const results = Array.from(document.querySelectorAll("item"))
    .map((item) => parseArtworkSearchResult(item, searchTerms))
    .filter((result): result is ArtworkSearchResult => result !== null);

  return Array.from(new Map(results.map((result) => [result.id, result])).values());
}

function parseArtworkSearchResult(
  item: Element,
  searchTerms: string[],
): ArtworkSearchResult | null {
  const title = item.querySelector("title")?.textContent?.trim() ?? "";
  const normalizedTitle = normalizeSearchText(title.replace("[Artwork]", ""));
  const link = item.querySelector("link")?.textContent?.trim() ?? "";

  if (
    !title.includes("[Artwork]") ||
    !isDeviantArtUserArtworkLink(link) ||
    searchTerms.some((term) => !normalizedTitle.includes(term))
  ) {
    return null;
  }

  const mediaContent = item.getElementsByTagName("media:content")[0];
  const thumbnails = Array.from(item.getElementsByTagName("media:thumbnail"));
  const lastThumbnail = thumbnails[thumbnails.length - 1];
  const imageUrl = mediaContent?.getAttribute("url") ?? lastThumbnail?.getAttribute("url");
  const previewUrl = thumbnails[0]?.getAttribute("url") ?? imageUrl;

  if (!link || !imageUrl || !previewUrl) {
    return null;
  }

  return {
    id: link,
    imageUrl,
    link,
    previewUrl,
    title,
  };
}

function formatDeviantArtQuery(query: string) {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("+");
}

function searchTermsFromQuery(query: string) {
  return normalizeSearchText(query)
    .split(" ")
    .filter((term) => term !== "artwork" && term !== DEVIANT_ART_USERNAME)
    .filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isDeviantArtUserArtworkLink(link: string) {
  try {
    const url = new URL(link);

    return (
      url.hostname === "www.deviantart.com" &&
      url.pathname.toLowerCase().startsWith(`/${DEVIANT_ART_USERNAME}/art/`)
    );
  } catch {
    return false;
  }
}
