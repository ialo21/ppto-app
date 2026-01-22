import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export default function Tooltip({ 
  content, 
  children, 
  position = "top",
  delay = 200 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        let x = 0;
        let y = 0;
        
        switch (position) {
          case "top":
            x = rect.left + scrollX + rect.width / 2;
            y = rect.top + scrollY - 8;
            break;
          case "bottom":
            x = rect.left + scrollX + rect.width / 2;
            y = rect.bottom + scrollY + 8;
            break;
          case "left":
            x = rect.left + scrollX - 8;
            y = rect.top + scrollY + rect.height / 2;
            break;
          case "right":
            x = rect.right + scrollX + 8;
            y = rect.top + scrollY + rect.height / 2;
            break;
        }
        
        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case "top":
        return "-translate-x-1/2 -translate-y-full";
      case "bottom":
        return "-translate-x-1/2";
      case "left":
        return "-translate-x-full -translate-y-1/2";
      case "right":
        return "-translate-y-1/2";
      default:
        return "-translate-x-1/2 -translate-y-full";
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div
          className={`
            fixed z-[9999] pointer-events-none
            ${getPositionClasses()}
          `}
          style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
        >
          <div className="
            bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl
            max-w-xs whitespace-nowrap
            animate-in fade-in zoom-in-95 duration-150
          ">
            {content}
            {/* Arrow */}
            <div className={`
              absolute w-2 h-2 bg-gray-900 transform rotate-45
              ${position === "top" ? "bottom-[-4px] left-1/2 -translate-x-1/2" : ""}
              ${position === "bottom" ? "top-[-4px] left-1/2 -translate-x-1/2" : ""}
              ${position === "left" ? "right-[-4px] top-1/2 -translate-y-1/2" : ""}
              ${position === "right" ? "left-[-4px] top-1/2 -translate-y-1/2" : ""}
            `} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
