import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";

export function GuideExampleConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { t } = useI18n();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelRef.current?.click();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const onCancelButton = document.activeElement === cancelRef.current;
        (onCancelButton ? confirmRef : cancelRef).current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onCancel();
  }}>
    <section className="guide-confirm-dialog" role="dialog" aria-modal="true"
      aria-labelledby="guide-confirm-title" aria-describedby="guide-confirm-description">
      <h2 id="guide-confirm-title">{t("guideLoadExample")}</h2>
      <p id="guide-confirm-description">{t("guideReplaceConfirm")}</p>
      <div className="dialog-actions">
        <button type="button" ref={cancelRef} onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="rf-action-primary" ref={confirmRef} onClick={onConfirm}>{t("guideLoadExample")}</button>
      </div>
    </section>
  </div>;
}
