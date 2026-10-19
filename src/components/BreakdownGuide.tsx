import { ArrowLeft, ArrowRight, Download, Eye, LocateFixed, Play, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider";
import { GUIDE_BACKGROUND_FILE } from "../data/guideExample";
import { useProjectStore } from "../store/projectStore";

const steps: { title: TranslationKey; body: TranslationKey; tip: TranslationKey; section?: string }[] = [
  { title: "guideStep1", body: "guideBody1", tip: "guideTip1" },
  { title: "guideStep2", body: "guideBody2", tip: "guideTip2", section: "title" },
  { title: "guideStep3", body: "guideBody3", tip: "guideTip3", section: "slices" },
  { title: "guideStep4", body: "guideBody4", tip: "guideTip4", section: "images" },
  { title: "guideStep5", body: "guideBody5", tip: "guideTip5" },
];

export function BreakdownGuide({ step, onStepChange, onClose, onLoadExample, onPreview, busy }: {
  step: number; onStepChange: (step: number) => void; onClose: () => void;
  onLoadExample: () => void; onPreview: () => void; busy: boolean;
}) {
  const { t } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [step]);
  const total = useProjectStore((state) => state.project.pieChart.slices.reduce((sum, slice) => sum + slice.value, 0));
  const current = steps[step];
  return <section id="breakdown-guide" className="breakdown-guide" aria-labelledby="guide-heading"
    onKeyDown={(event) => { if (event.key === "Escape" && !document.querySelector('[aria-modal="true"]')) onClose(); }}>
    <div className="guide-overview">
      <span className="guide-eyebrow">{t("guideEyebrow")}</span>
      <h2 id="guide-heading">{t("guideTitle")}</h2>
      <p>{t("guideIntro")}</p>
      <a href={`${import.meta.env.BASE_URL}${GUIDE_BACKGROUND_FILE}`} download="breakdown-background-1080.png">
        <Download size={14} aria-hidden="true" />{t("guideDownloadBackground")}
      </a>
    </div>
    <div className="guide-lesson">
      <nav className="guide-steps" aria-label={t("guideSteps")}>
        {steps.map((item, index) => <button key={item.title} type="button"
          aria-current={index === step ? "step" : undefined}
          aria-label={t("guideStepLabel", { number: index + 1, title: t(item.title) })}
          onClick={() => onStepChange(index)}>
          <span aria-hidden="true">{index + 1}</span>{t(item.title)}
        </button>)}
      </nav>
      <div className="guide-instructions" aria-live="polite" aria-atomic="true">
        <h3 ref={headingRef} tabIndex={-1}>{t(current.title)}</h3>
        <p>{t(current.body)}</p>
        {step === 2 ? <strong className="guide-total">{t("guideCurrentTotal", { total })}</strong> : null}
        <p className="guide-tip">{t(current.tip)}</p>
      </div>
      <div className="guide-actions">
        {step === 0 ? <button type="button" className="rf-action-primary" disabled={busy} onClick={onLoadExample}>
          <Play size={15} aria-hidden="true" />{t("guideLoadExample")}
        </button> : current.section ? <button type="button" onClick={() => {
          window.dispatchEvent(new CustomEvent("breakdown:guide-section", { detail: current.section }));
        }}><LocateFixed size={15} aria-hidden="true" />{t("guideShowControls")}</button>
          : <button type="button" onClick={onPreview}><Eye size={15} aria-hidden="true" />{t("previewPng")}</button>}
        <div className="guide-pagination">
          <button type="button" disabled={step === 0} aria-label={t("guidePrevious")} onClick={() => onStepChange(step - 1)}>
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
          <span>{t("guideProgress", { current: step + 1, total: steps.length })}</span>
          <button type="button" onClick={() => step === steps.length - 1 ? onClose() : onStepChange(step + 1)}>
            {t(step === steps.length - 1 ? "guideFinish" : "guideNext")}<ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
    <figure className="guide-example">
      <img src={`${import.meta.env.BASE_URL}${GUIDE_BACKGROUND_FILE}`} alt={t("guideBackgroundAlt")} width="1080" height="1080" />
      <figcaption>{t("guideCanvasSize")}</figcaption>
    </figure>
    <button type="button" className="guide-close icon-button" aria-label={t("guideClose")} onClick={onClose}><X size={17} /></button>
  </section>;
}
