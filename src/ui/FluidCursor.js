import React, { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, Zap, Scan, MousePointer2 } from 'lucide-react';

// Define the engaging color constants
const USER_COLOR_FILL = "#6366f1"; // Indigo
const USER_COLOR_GLOW = "rgba(99, 102, 241, 0.6)"; // Indigo glow

const AI_COLOR_FILL = "#ff9900"; // Electric Orange
const AI_COLOR_STROKE = "#8a2be2"; // Deep Violet
const AI_COLOR_GLOW = "rgba(255, 153, 0, 0.8)";

export default function FluidCursor({ isAnalyzing, showAi = true }) {
  const mousePos = useRef({ x: -100, y: -100 });
  const userTagPos = useRef({ x: -100, y: -100 });
  const aiCursorPos = useRef({ x: -100, y: -100 });
  const aiTargetPos = useRef(null);
  
  const userCursorRef = useRef(null);
  const userTagRef = useRef(null);
  const aiCursorRef = useRef(null);
  
  const [isClicking, setIsClicking] = useState(false);
  const [hoverState, setHoverState] = useState('default'); 

  // AI Autonomous Movement Logic
  const pickRandomTarget = () => {
      if (!showAi) return;
      const interactives = document.querySelectorAll('button, a, input, textarea, [role="button"]');
      if (interactives.length > 0) {
          const randomEl = interactives[Math.floor(Math.random() * interactives.length)];
          const rect = randomEl.getBoundingClientRect();
          aiTargetPos.current = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
          };
          
          setTimeout(() => {
              aiTargetPos.current = null; 
          }, 800);
      }
  };

  useEffect(() => {
      if (isAnalyzing && showAi) {
          const interval = setInterval(pickRandomTarget, 1500);
          pickRandomTarget(); 
          return () => clearInterval(interval);
      } else {
          aiTargetPos.current = null;
      }
  }, [isAnalyzing, showAi]);

  useEffect(() => {
    const handleMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      
      const target = e.target;
      if (target) {
          const tagName = target.tagName.toLowerCase();
          const isClickable = tagName === 'button' || tagName === 'a' || target.getAttribute('role') === 'button' || target.closest('button') || target.closest('a');
          const isInput = tagName === 'input' || tagName === 'textarea' || target.getAttribute('contenteditable') === 'true';
          
          let newState = 'default';
          if (isClickable) newState = 'button';
          else if (isInput) newState = 'text';
          
          setHoverState(prev => prev !== newState ? newState : prev);
      }
    };

    const handleDown = () => setIsClicking(true);
    const handleUp = () => setIsClicking(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);

    let animationFrameId;
    
    const render = () => {
      // 1. User Tag Physics
      userTagPos.current.x += (mousePos.current.x - userTagPos.current.x) * 0.2;
      userTagPos.current.y += (mousePos.current.y - userTagPos.current.y) * 0.2;

      // 2. AI Cursor Physics
      let targetAiX, targetAiY;
      let aiSpeed = 0.08;

      if (showAi) {
        if (isAnalyzing && aiTargetPos.current) {
            targetAiX = aiTargetPos.current.x;
            targetAiY = aiTargetPos.current.y;
            aiSpeed = 0.12; 
        } else if (isAnalyzing) {
            targetAiX = aiCursorPos.current.x + Math.sin(Date.now() / 500) * 2;
            targetAiY = aiCursorPos.current.y + Math.cos(Date.now() / 500) * 2;
        } else {
            targetAiX = mousePos.current.x + 60;
            targetAiY = mousePos.current.y + 45;
        }

        aiCursorPos.current.x += (targetAiX - aiCursorPos.current.x) * aiSpeed;
        aiCursorPos.current.y += (targetAiY - aiCursorPos.current.y) * aiSpeed;
      }

      if (userCursorRef.current) {
          userCursorRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }
      if (userTagRef.current) {
          userTagRef.current.style.transform = `translate3d(${userTagPos.current.x}px, ${userTagPos.current.y}px, 0)`;
      }
      if (aiCursorRef.current && showAi) {
          aiCursorRef.current.style.transform = `translate3d(${aiCursorPos.current.x}px, ${aiCursorPos.current.y}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAnalyzing, showAi]);

  const getAiMessage = () => {
    if (isAnalyzing) return "Inspecting UI...";
    if (hoverState === 'button') return "Interact?";
    if (hoverState === 'text') return "Edit text?";
    if (isClicking) return "Action detected";
    return "AI Co-pilot";
  };

  return (
    <>
      <style>
        {`
          html, body, * {
            cursor: none !important;
          }
          a, button, input, textarea, [role="button"], select {
            cursor: none !important;
          }
          iframe {
            pointer-events: auto;
            cursor: none !important;
          }
        `}
      </style>

      {/* --- USER CURSOR --- */}
      {/* Label Tag */}
      <div ref={userTagRef} style={{ zIndex: 9999 }} className="fixed top-0 left-0 pointer-events-none will-change-transform">
        <div className={`absolute top-8 left-8 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-black text-white border border-indigo-500/50 shadow-2xl backdrop-blur-md transition-all duration-200 flex items-center gap-2 ${isClicking ? 'scale-90 opacity-80' : 'scale-100'}`}>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            COMMANDER
        </div>
      </div>
      
      {/* Visual Cursor Arrow (Proper Pointer Shape) */}
      <div ref={userCursorRef} style={{ zIndex: 9999 }} className="fixed top-0 left-0 pointer-events-none will-change-transform">
        <div className={`relative transition-transform duration-100 ${isClicking ? 'scale-90' : 'scale-100'}`}>
           {/* Standard Pointer SVG - Upscaled */}
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 15px ${USER_COLOR_GLOW})` }}>
             <path 
                d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" 
                fill={USER_COLOR_FILL} 
                stroke="white" 
                strokeWidth="1.5" 
                strokeLinejoin="round"
             />
           </svg>
        </div>
      </div>

      {/* --- AI CO-PILOT CURSOR (Ghost Pointer) --- */}
      {showAi && (
        <div ref={aiCursorRef} style={{ zIndex: 9998 }} className="fixed top-0 left-0 pointer-events-none will-change-transform transition-opacity duration-500">
          <div className="relative flex items-center">
            
            {/* AI Shape (Pointer) */}
            <div className="relative w-8 h-8 p-1.5 transform -translate-x-1/2 -translate-y-1/2">
              {/* Ghost Pointer */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 10px ${AI_COLOR_GLOW})` }} className={`${isAnalyzing ? 'animate-bounce-slow' : ''}`}>
                <path 
                    d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" 
                    fill={AI_COLOR_FILL} 
                    stroke={AI_COLOR_STROKE} 
                    strokeWidth="1.5" 
                    strokeLinejoin="round"
                    fillOpacity="0.8"
                />
              </svg>
            </div>
            
            {/* AI Message Bubble */}
            <div className="absolute left-6 top-2 ml-3 px-4 py-2 rounded-2xl bg-black/80 border border-orange-500/30 backdrop-blur-xl shadow-2xl flex items-center gap-3 min-w-max">
              {isAnalyzing ? <Scan size={14} className="text-orange-400 animate-spin-slow" /> : <Sparkles size={14} className="text-orange-400" />}
              <span className="text-xs font-bold text-white whitespace-nowrap tracking-wide">{getAiMessage()}</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
}