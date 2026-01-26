import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

type PageDefinition = {
  id: string;
  durationMs: number;
  element: ReactNode;
};

type PageRotatorProps = {
  pages: PageDefinition[];
  fadeMs?: number;
};

export default function PageRotator({ pages, fadeMs = 700 }: PageRotatorProps) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const fadeTimeout = useRef<number | null>(null);
  const swapTimeout = useRef<number | null>(null);

  const activePage = useMemo(() => pages[index], [pages, index]);

  useEffect(() => {
    if (!pages.length) {
      return;
    }

    const duration = pages[index]?.durationMs ?? 10_000;

    const cycle = window.setTimeout(() => {
      setIsFading(true);
      swapTimeout.current = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % pages.length);
        fadeTimeout.current = window.setTimeout(() => {
          setIsFading(false);
        }, fadeMs);
      }, fadeMs);
    }, duration);

    return () => {
      window.clearTimeout(cycle);
      if (swapTimeout.current) {
        window.clearTimeout(swapTimeout.current);
      }
      if (fadeTimeout.current) {
        window.clearTimeout(fadeTimeout.current);
      }
    };
  }, [pages, index, fadeMs]);

  if (!pages.length) {
    return <div className="page-empty">Waiting for schedule...</div>;
  }

  return (
    <div className={`page-viewport ${isFading ? 'is-fading' : ''}`}>
      <div className="page" key={activePage.id}>
        {activePage.element}
      </div>
      <div className="fade-overlay" aria-hidden="true" />
    </div>
  );
}
