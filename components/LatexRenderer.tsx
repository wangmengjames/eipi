
import React, { useEffect, useRef } from 'react';

interface LatexRendererProps {
  text: string;
  className?: string;
}

const LatexRenderer: React.FC<LatexRendererProps> = React.memo(({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.MathJax && containerRef.current) {
      // Clear previous content handled by MathJax to avoid duplication issues
      containerRef.current.innerHTML = text;
      
      // Request MathJax to typeset the element
      // Using a small timeout to batch updates slightly if React renders quickly
      const timer = setTimeout(() => {
        if (containerRef.current) {
             window.MathJax.typesetPromise([containerRef.current])
            .catch((err: any) => console.error('MathJax error:', err));
        }
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className={`text-slate-900 whitespace-pre-wrap break-words leading-relaxed ${className || ''}`}
    />
  );
});

export default LatexRenderer;
