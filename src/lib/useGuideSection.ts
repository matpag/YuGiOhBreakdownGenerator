import { useEffect, type Dispatch, type SetStateAction } from "react";

export function useGuideSection(sections: string, setCollapsed: Dispatch<SetStateAction<boolean>>) {
  useEffect(() => {
    let frame = 0;
    function reveal(event: Event) {
      const section: unknown = (event as CustomEvent).detail;
      if (typeof section !== "string" || !sections.split(" ").includes(section)) return;
      setCollapsed(false);
      frame = requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>(`[data-guide-section="${section}"] h2`);
        heading?.scrollIntoView({ block: "start" });
        heading?.focus({ preventScroll: true });
      });
    }
    window.addEventListener("breakdown:guide-section", reveal);
    return () => {
      window.removeEventListener("breakdown:guide-section", reveal);
      cancelAnimationFrame(frame);
    };
  }, [sections, setCollapsed]);
}
