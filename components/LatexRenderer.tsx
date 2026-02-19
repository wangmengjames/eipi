
import React, { useEffect, useRef } from 'react';

interface LatexRendererProps {
  text: string;
  className?: string;
}

const sanitizeHTML = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  const sanitized = div.innerHTML;
  // Restore LaTeX delimiters that textContent would escape
  return sanitized
    .replace(/&lt;/g, (_, offset, str) => {
      // Only restore < that are part of known safe HTML tags used by MathJax output
      return '&lt;';
    });
};

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
