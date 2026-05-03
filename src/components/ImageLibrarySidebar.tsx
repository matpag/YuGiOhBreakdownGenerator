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
} from "lucide-react";
import { fileToAsset, remoteImageToAsset, validateImageFile } from "../lib/assets";
import { useProjectStore } from "../store/projectStore";
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
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const addAsset = useProjectStore((state) => state.addAsset);
  const addImageLibraryItem = useProjectStore((state) => state.addImageLibraryItem);
  const renameImageLibraryItem = useProjectStore((state) => state.renameImageLibraryItem);
  const removeImageLibraryItem = useProjectStore((state) => state.removeImageLibraryItem);
  const setSliceAsset = useProjectStore((state) => state.setSliceAsset);
  const [collapsed, setCollapsed] = useState(false);
  const [artworkSearchQuery, setArtworkSearchQuery] = useState("");
  const [artworkSearchResults, setArtworkSearchResults] = useState<ArtworkSearchResult[]>([]);
  const [artworkSearchPage, setArtworkSearchPage] = useState(0);
  const [artworkSearchStatus, setArtworkSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [artworkSearchError, setArtworkSearchError] = useState<string | null>(null);
  const [addingArtworkId, setAddingArtworkId] = useState<string | null>(null);
  const [addedArtworkIds, setAddedArtworkIds] = useState<Set<string>>(() => new Set());
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
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
      setImageUploadError(errors[0]);
      return;
    }

    setImageUploadError(null);

    try {
      for (const file of files) {
        const asset = await fileToAsset(file);

        enqueueImageLibraryAsset(asset);
      }
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Could not read image file.");
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
      setArtworkSearchError(error instanceof Error ? error.message : "Image search failed.");
    }
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
      setArtworkSearchError(error instanceof Error ? error.message : "Could not add artwork.");
    } finally {
      setAddingArtworkId(null);
    }
  }

  return (
    <aside className={`library-sidebar ${collapsed ? "library-sidebar-collapsed" : ""}`}>
      <button
        className="library-collapse-button"
        type="button"
        title={collapsed ? "Open image library" : "Collapse image library"}
        onClick={() => setCollapsed((isCollapsed) => !isCollapsed)}
      >
        {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
      </button>

      {collapsed ? null : (
        <div className="library-content-stack">
          <section className="panel image-searcher-panel">
            <h2>Image Searcher</h2>
            <form
              className="image-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                searchArtwork();
              }}
            >
              <label>
                Card name
                <input
                  type="search"
                  placeholder="Thunder King"
                  value={artworkSearchQuery}
                  onChange={(event) => setArtworkSearchQuery(event.target.value)}
                />
              </label>
              <button type="submit" disabled={artworkSearchStatus === "loading"}>
                <Search size={16} />
                {artworkSearchStatus === "loading" ? "Searching" : "Search"}
              </button>
            </form>
            {artworkSearchQuery.trim() ? (
              <a className="image-search-source" href={artworkSearchUrl} target="_blank" rel="noreferrer">
                Open DeviantArt search
              </a>
            ) : null}
            {artworkSearchError ? <p className="field-error">{artworkSearchError}</p> : null}
            {artworkSearchResults.length > IMAGE_SEARCH_RESULTS_PER_PAGE ? (
              <div className="image-search-pagination">
                <button
                  className="icon-button"
                  type="button"
                  title="Previous image search page"
                  disabled={artworkSearchPage === 0}
                  onClick={() => setArtworkSearchPage((page) => Math.max(0, page - 1))}
                >
                  <ChevronLeft size={15} />
                </button>
                <span>
                  {artworkSearchPageStart + 1}-
                  {Math.min(
                    artworkSearchPageStart + IMAGE_SEARCH_RESULTS_PER_PAGE,
                    artworkSearchResults.length,
                  )}{" "}
                  of {artworkSearchResults.length}
                </span>
                <button
                  className="icon-button"
                  type="button"
                  title="Next image search page"
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
                        {isAddingArtwork ? "Adding" : isArtworkAdded ? "Added" : "Add"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {artworkSearchStatus === "ready" && artworkSearchResults.length === 0 ? (
              <p className="empty-state">No artwork results found.</p>
            ) : null}
          </section>

          <section className="panel library-panel">
            <div className="panel-heading-row">
              <h2>Image Library</h2>
              <label className="file-button">
                <ImagePlus size={16} />
                Add
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
            {imageUploadError ? <p className="field-error">{imageUploadError}</p> : null}
            <label>
              Search
              <input
                type="search"
                placeholder="Find by image name"
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
                          title="Rename image"
                          onClick={() => startRenaming(item.id, item.name)}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                      <div className="asset-card-actions">
                        <button
                          type="button"
                          title="Use on selected slice"
                          disabled={!selectedSlice}
                          onClick={() => {
                            if (selectedSlice) {
                              setSliceAsset(selectedSlice.id, item.assetId);
                            }
                          }}
                        >
                          Slice
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          title="Remove from library"
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
              <p className="empty-state">No images match this search.</p>
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
            <h2 id="rename-image-title">Rename Image</h2>
            <label>
              Image name
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
                Cancel
              </button>
              <button type="submit" disabled={!renameDialogName.trim()}>
                Save
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
            <h2 id="name-image-title">Name Image</h2>
            <label>
              Image name
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
                Cancel
              </button>
              <button type="submit" disabled={!pendingImageName.trim()}>
                Add
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
