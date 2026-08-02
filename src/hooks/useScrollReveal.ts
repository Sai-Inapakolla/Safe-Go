import { useEffect, useRef } from "react";

export function useScrollReveal(deps: any[] = []) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = el.querySelectorAll('[class*="scroll-reveal"]:not(.revealed)');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("revealed"), i * 100);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, deps);

  return ref;
}
