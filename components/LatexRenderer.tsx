
import React, { useEffect, useRef } from 'react';

interface LatexRendererProps {
  text: string;
  className?: string;
}

const LatexRenderer: React.FC<LatexRendererProps> = React.memo(({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Safely set text content first (no XSS risk)
      containerRef.current.textContent = text;

      // Then let MathJax process it for LaTeX rendering
      if (window.MathJax) {
        const timer = setTimeout(() => {
          if (containerRef.current) {
            window.MathJax.typesetPromise([containerRef.current])
              .catch((err: any) => console.error('MathJax error:', err));
          }
        }, 0);

        return () => clearTimeout(timer);
      }
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`text-gray-900 whitespace-pre-wrap break-words leading-relaxed ${className || ''}`}
    />
  );
});

LatexRenderer.displayName = 'LatexRenderer';

export default LatexRenderer;
