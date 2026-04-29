import { useState } from "react";
import { ImagePlus, PanelRightClose, PanelRightOpen, Trash2 } from "lucide-react";
import { fileToAsset, validateImageFile } from "../lib/assets";
import { useProjectStore } from "../store/projectStore";

export function ImageLibrarySidebar() {
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const addAsset = useProjectStore((state) => state.addAsset);
  const addImageLibraryItem = useProjectStore((state) => state.addImageLibraryItem);
  const removeImageLibraryItem = useProjectStore((state) => state.removeImageLibraryItem);
  const setBackgroundAsset = useProjectStore((state) => state.setBackgroundAsset);
  const setSliceAsset = useProjectStore((state) => state.setSliceAsset);
  const [collapsed, setCollapsed] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageLibrarySearch, setImageLibrarySearch] = useState("");
  const selectedSlice =
    project.pieChart.slices.find((slice) => slice.id === project.pieChart.selectedSliceId) ?? null;
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

    for (const file of files) {
      const asset = await fileToAsset(file);
      const assetId = addAsset(asset);

      addImageLibraryItem({
        id: crypto.randomUUID(),
        assetId,
        name: asset.name,
        createdAt: new Date().toISOString(),
      });
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
                    <strong title={item.name}>{item.name}</strong>
                    <div className="asset-card-actions">
                      <button
                        type="button"
                        title="Use as background"
                        onClick={() => setBackgroundAsset(item.assetId)}
                      >
                        BG
                      </button>
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
      )}
    </aside>
  );
}
