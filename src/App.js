import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BackgroundGradient } from "./ui/background-gradient";
import { GlowingEffect, PulsingGlow } from "./ui/glowing-effect";
import FluidCursor from "./ui/FluidCursor";
import { CometCard } from "./ui/comet-card";
import { CardSpotlight } from "./ui/card-spotlight";
import { ThreeDButton } from "./ui/3d-button";
import { Hand, MousePointer2, LocateFixed, StickyNote, Bot, Wand2, Eraser, PlusSquare, X, Users, Globe, Download, Moon, Sun, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import LaserFlow from "./ui/LaserFlow";
import { cn } from "./utils/cn";
import { playMagicalSound, playProgressSound } from "./utils/sounds";

// API Configuration - Uses environment variable
// Fallback to empty string if not set, will be handled by UI state
const ENV_API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'x-ai/grok-code-fast-1';

function App() {
    const [currentStep, setCurrentStep] = useState('prompt');
    const [appIdea, setAppIdea] = useState('');
    const [appType, setAppType] = useState('Web App');
    const [designStyle, setDesignStyle] = useState('Modern & Minimal');
    const [screenCount, setScreenCount] = useState(6);
    const [progress, setProgress] = useState(0);
    const [generatedScreens, setGeneratedScreens] = useState([]);
    const [flowData, setFlowData] = useState(null);
    const [error, setError] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentPhase, setCurrentPhase] = useState('');

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [showAnalysis, setShowAnalysis] = useState(false);

    // API Key State
    const [apiKey, setApiKey] = useState(ENV_API_KEY);
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // Canvas State
    const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(0.6);
    const canvasRef = useRef(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    // Tools State: 'select' | 'hand' | 'wand' | 'eraser' | 'note'
    const [activeTool, setActiveTool] = useState('select');

    const [dragState, setDragState] = useState({
        isDragging: false,
        type: null, // 'canvas' or 'screen' or 'note'
        startX: 0,
        startY: 0,
        targetIndex: null,
        initialX: 0,
        initialY: 0
    });

    // Connection State
    const [isPrototypeMode, setIsPrototypeMode] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connections, setConnections] = useState([]);
    // connectionStart: { screenIndex, elementId (optional), startX, startY }
    const [connectionStart, setConnectionStart] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // AI Companion State
    const [showAi, setShowAi] = useState(true);

    // Sticky Notes State
    const [stickyNotes, setStickyNotes] = useState([]);

    // Magic Edit State
    // { screenIndex, rect: {top, left, width, height}, originalHtml, prompt: '' }
    const [magicSelection, setMagicSelection] = useState(null);
    const [isMagicEditing, setIsMagicEditing] = useState(false);

    // Research State
    const [showResearch, setShowResearch] = useState(false);
    const [researchType, setResearchType] = useState(null); // 'user' | 'competitor'
    const [researchData, setResearchData] = useState({ user: null, competitor: null });
    const [isResearching, setIsResearching] = useState(false);

    // Theme State
    const [darkMode, setDarkMode] = useState(true); // Default to dark mode for the landing page vibe

    // LaserFlow Overlay State (for results page dramatic reveal)
    const [showResultsLaserFlow, setShowResultsLaserFlow] = useState(false);



    // Initialize API key
    useEffect(() => {
        const storedKey = localStorage.getItem('flowcraft_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        } else if (ENV_API_KEY) {
            setApiKey(ENV_API_KEY);
        }
    }, []);

    // Broadcast Tool Change to Iframes
    useEffect(() => {
        const frames = document.querySelectorAll('iframe');
        frames.forEach(frame => {
            frame.contentWindow?.postMessage({
                type: 'TOOL_CHANGE',
                tool: activeTool
            }, '*');
        });
    }, [activeTool, generatedScreens]);

    // Handle postMessages from iframes
    useEffect(() => {
        const handleMessage = (event) => {
            const { type, screenIndex, elementId, x, y, rect, html } = event.data;

            if (type === 'START_CONNECTION' && isPrototypeMode) {
                const screen = generatedScreens[screenIndex];
                if (!screen) return;

                const dims = getScreenDimensions(appType);
                const screenX = screen.position.x;
                const screenY = screen.position.y;

                const startX = screenX + x;
                const startY = screenY + y + 60;

                setConnectionStart({
                    screenIndex,
                    elementId,
                    startX: startX,
                    startY: startY
                });
                setIsConnecting(true);
            }

            if (type === 'HTML_UPDATED') {
                // Update screen HTML in state
                const newScreens = [...generatedScreens];
                newScreens[screenIndex].html = html;
                setGeneratedScreens(newScreens);
            }

            if (type === 'MAGIC_SELECT') {
                // Calculate absolute position for the magic input
                const screen = generatedScreens[screenIndex];
                if (!screen) return;

                // rect is relative to iframe viewport
                // We need to convert to screen coordinates
                // Screen pos + header offset + rect pos
                // Actually, we render the overlay *inside* the canvas scaling context or outside?
                // Rendering outside is easier for z-index, but requires coordinate mapping.

                // Let's render it *inside* the canvas transformation div so it scales/moves with canvas naturally
                // Position relative to the screen card
                setMagicSelection({
                    screenIndex,
                    rect, // { top, left, width, height } relative to iframe
                    originalHtml: html,
                    prompt: ''
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isPrototypeMode, generatedScreens, appType, activeTool]);

    // Key/Mouse listeners
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && !isSpacePressed && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setIsSpacePressed(true);
            }
            // Delete key handling for screens/notes?
            if ((e.code === 'Delete' || e.code === 'Backspace') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                // Check if a note is selected? (Implementation complexity: selection state for notes)
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                if (dragState.type === 'canvas' && activeTool !== 'hand') {
                    setDragState(prev => ({ ...prev, isDragging: false, type: null }));
                }
            }
        };

        const handleWheel = (e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                setZoom(z => Math.min(Math.max(0.1, z * delta), 5));
            } else {
                setCanvasPosition(prev => ({
                    x: prev.x - e.deltaX,
                    y: prev.y - e.deltaY
                }));
            }
        };

        const handleGlobalMouseUp = () => {
            if (dragState.isDragging) {
                setDragState({ isDragging: false, type: null, startX: 0, startY: 0, targetIndex: null, initialX: 0, initialY: 0 });
            }
            if (isConnecting) {
                setIsConnecting(false);
                setConnectionStart(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            if (canvas) {
                canvas.removeEventListener('wheel', handleWheel);
            }
        };
    }, [isSpacePressed, dragState.type, isConnecting, dragState.isDragging, activeTool]);

    const handleApiKeyChange = (e) => {
        const newKey = e.target.value;
        setApiKey(newKey);
        localStorage.setItem('flowcraft_api_key', newKey);
    };

    const getScreenDimensions = (type) => {
        switch (type) {
            case 'Web App':
            case 'SaaS Dashboard':
            case 'E-commerce':
                return { width: 1024, height: 720 };
            case 'Mobile App':
            default:
                return { width: 375, height: 812 };
        }
    };

    // Inject prototype & tool scripts
    const getAugmentedHTML = (html, index) => {
        if (!html) return '';

        // Check if html already has the script (prevent duplication if state got dirty)
        if (html.includes('id="flowcraft-tools"')) {
            return html;
        }

        const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
        const script = `
        <script id="flowcraft-tools">
          let currentTool = '${activeTool}';
          
          window.addEventListener('message', (e) => {
              if (e.data.type === 'TOOL_CHANGE') {
                  currentTool = e.data.tool;
                  document.body.style.cursor = currentTool === 'wand' ? 'crosshair' : (currentTool === 'eraser' ? 'not-allowed' : 'none');
              }
              if (e.data.type === 'APPLY_MAGIC_EDIT') {
                  const target = document.querySelector('[data-editing="true"]');
                  if (target) {
                      target.outerHTML = e.data.newHtml;
                      
                      // Send updated HTML (Clean up tool script before sending)
                      const clone = document.documentElement.cloneNode(true);
                      const toolScript = clone.querySelector('#flowcraft-tools');
                      if (toolScript) toolScript.remove();
                      
                      window.parent.postMessage({
                          type: 'HTML_UPDATED',
                          screenIndex: ${index},
                          html: clone.outerHTML
                      }, '*');
                  }
              }
          });

          // Hide system cursor default
          document.body.style.cursor = 'none';
          
          document.body.addEventListener('mouseover', (e) => {
              if (currentTool === 'eraser') {
                  e.target.style.outline = '2px solid red';
                  e.target.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
              } else if (currentTool === 'wand') {
                  e.target.style.outline = '2px solid #8a2be2';
                  e.target.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
              }
          });
          
          document.body.addEventListener('mouseout', (e) => {
              if (currentTool === 'eraser' || currentTool === 'wand') {
                  e.target.style.outline = '';
                  e.target.style.backgroundColor = '';
              }
          });

          document.body.addEventListener('click', (e) => {
              if (currentTool === 'eraser') {
                  e.preventDefault();
                  e.stopPropagation();
                  e.target.remove();
                  
                  const clone = document.documentElement.cloneNode(true);
                  const toolScript = clone.querySelector('#flowcraft-tools');
                  if (toolScript) toolScript.remove();

                  window.parent.postMessage({
                      type: 'HTML_UPDATED',
                      screenIndex: ${index},
                      html: clone.outerHTML
                  }, '*');
              } else if (currentTool === 'wand') {
                  e.preventDefault();
                  e.stopPropagation();
                  // Mark element
                  const prev = document.querySelector('[data-editing="true"]');
                  if (prev) prev.removeAttribute('data-editing');
                  
                  e.target.setAttribute('data-editing', 'true');
                  const rect = e.target.getBoundingClientRect();
                  
                  window.parent.postMessage({
                      type: 'MAGIC_SELECT',
                      screenIndex: ${index},
                      rect: rect,
                      html: e.target.outerHTML
                  }, '*');
              }
          });

          // Interactive Elements for Prototype
          const interactives = document.querySelectorAll('button, a, input, [role="button"]');
          interactives.forEach(el => {
             if (${isPrototypeMode}) {
                 el.style.cursor = 'none'; 
                 el.addEventListener('mouseenter', () => {
                     if(currentTool === 'select') {
                        el.style.outline = '2px solid #3b82f6'; // Figma Blue
                        el.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
                     }
                 });
                 el.addEventListener('mouseleave', () => {
                     if(currentTool === 'select') {
                        el.style.outline = 'none';
                        el.style.boxShadow = 'none';
                     }
                 });
                 el.addEventListener('mousedown', (e) => {
                     if(currentTool === 'select') {
                         e.preventDefault();
                         e.stopPropagation();
                         const rect = el.getBoundingClientRect();
                         window.parent.postMessage({
                             type: 'START_CONNECTION',
                             screenIndex: ${index},
                             elementId: el.id || el.innerText || 'unknown',
                             x: rect.left + rect.width / 2,
                             y: rect.top + rect.height / 2,
                             rect: rect
                         }, '*');
    }
                 });
             }
          });
        </script>
      `;
        return tailwindScript + html + script;
    };

    const callGrokAPI = async (prompt) => {
        if (!apiKey) throw new Error('API key not configured.');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://flowcraft-ai.vercel.app',
                    'X-Title': 'FlowCraft AI'
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setShowApiKeyInput(true);
                    throw new Error('Invalid API Key');
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    };

    const callResearchAPI = async (prompt) => {
        if (!apiKey) throw new Error('API key not configured.');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://flowcraft-ai.vercel.app',
                    'X-Title': 'FlowCraft AI'
                },
                body: JSON.stringify({
                    model: 'perplexity/sonar',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            return {
                content: data.choices[0].message.content,
                citations: data.citations || []
            };
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    };

    const handleResearch = async (type) => {
        setResearchType(type);
        setShowResearch(true);

        // If we already have data for this type, don't regenerate unless forced (could add force refresh later)
        if (researchData[type]) return;

        setIsResearching(true);
        try {
            const prompt = type === 'user'
                ? `Conduct comprehensive user research for this app idea: "${appIdea}" (Type: ${appType}). 
               Focus on:
               1. Target Audience Demographics
               2. Key User Pain Points
               3. User Desires & Motivations
               4. Behavioral Patterns
               Provide citations where possible.`
                : `Conduct competitor research for this app idea: "${appIdea}" (Type: ${appType}). 
               Identify 3-5 key competitors. For each, analyze:
               1. Core Features
               2. Strengths & Weaknesses
               3. Pricing Models (if available)
               4. Market Gaps this app can fill
               Provide citations where possible.`;

            const result = await callResearchAPI(prompt);
            setResearchData(prev => ({ ...prev, [type]: result }));
        } catch (e) {
            console.error("Research failed", e);
            setResearchData(prev => ({ ...prev, [type]: { content: "Failed to fetch research data. Please try again.", citations: [] } }));
        } finally {
            setIsResearching(false);
        }
    };

    // Magic Edit Logic
    const applyMagicEdit = async () => {
        if (!magicSelection || !magicSelection.prompt) return;
        setIsMagicEditing(true);

        try {
            const prompt = `You are an expert Tailwind CSS developer. Edit this specific HTML element based on the user's request, maintaining the existing design language and Tailwind classes unless explicitly asked to change them.

CONTEXT:
- App Style: ${designStyle}
- User Request: ${magicSelection.prompt}

ORIGINAL ELEMENT HTML:
${magicSelection.originalHtml}

INSTRUCTIONS:
1. Return ONLY the updated HTML for this specific element.
2. Ensure you use Tailwind CSS classes for styling. Do NOT use inline styles.
3. Do NOT return a full HTML document, just the element.
4. Make it look modern and professional.

UPDATED ELEMENT HTML:`;

            const newHtml = await callGrokAPI(prompt);
            const cleanHtml = newHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

            // Send to iframe
            const frame = document.querySelector(`iframe[title="${generatedScreens[magicSelection.screenIndex].name}"]`);
            if (frame) {
                frame.contentWindow.postMessage({
                    type: 'APPLY_MAGIC_EDIT',
                    newHtml: cleanHtml
                }, '*');
            }
            setMagicSelection(null);
        } catch (e) {
            console.error("Magic edit failed", e);
        } finally {
            setIsMagicEditing(false);
        }
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.1, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.1, 0.1));
    };

    // ... (Previous analyzeFlow, generateAppFlow, generateScreenUI, handleRegenerate... keep same)
    const analyzeFlow = async () => {
        if (isAnalyzing || generatedScreens.length === 0) return;

        setIsAnalyzing(true);
        setShowAnalysis(false);

        try {
            const screensSummary = generatedScreens.map((s, i) =>
                `${i + 1}. ${s.name} (${s.type}): ${s.description}`
            ).join('\n');

            const analysisPrompt = `You are a Senior UX/UI Designer acting as a Co-pilot. Analyze this app flow:
APP IDEA: ${appIdea}
TYPE: ${appType}
SCREENS:
${screensSummary}

Provide 3 specific, high-impact design improvements for better UX, flow consistency, or visual appeal.
Keep each point concise (max 20 words).
Format as valid JSON:
{
  "improvements": [
    {"title": "Action Title", "description": "Concise detail"},
    {"title": "Action Title", "description": "Concise detail"},
    {"title": "Action Title", "description": "Concise detail"}
  ]
}`;

            const response = await callGrokAPI(analysisPrompt);
            const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleanResponse);

            setAnalysisResults(result.improvements);
            setShowAnalysis(true);
        } catch (e) {
            console.error("Analysis failed", e);
            setAnalysisResults([{ title: "Analysis Failed", description: "Could not generate insights at this time." }]);
            setShowAnalysis(true);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const fetchScreenUI = async (index, screenData) => {
        try {
            const uiPrompt = `Create a beautiful ${appType} screen UI with ${designStyle} design.
SCREEN: ${screenData.name}
DESCRIPTION: ${screenData.description}
ELEMENTS: ${screenData.elements.join(', ')}

IMPORTANT INSTRUCTIONS:
1. Generate ONLY valid HTML code with Tailwind CSS classes.
2. Do NOT include any conversational text, explanations, or markdown formatting (like \`\`\`html).
3. The output must be a single HTML string starting with <div and ending with </div>.
4. Make it modern, professional, and visually stunning.`;

            const rawResponse = await callGrokAPI(uiPrompt);

            // Robust cleaning to extract only HTML
            let cleanHtml = rawResponse;
            const htmlMatch = rawResponse.match(/<div[\s\S]*<\/div>/);
            if (htmlMatch) {
                cleanHtml = htmlMatch[0];
            } else {
                // Fallback cleanup if regex fails but markdown exists
                cleanHtml = rawResponse.replace(/```html/g, '').replace(/```/g, '').trim();
            }

            setGeneratedScreens(prevScreens => {
                const newScreens = [...prevScreens];
                if (newScreens[index]) {
                    newScreens[index] = {
                        ...newScreens[index],
                        status: 'completed',
                        html: cleanHtml
                    };
                }
                return newScreens;
            });
        } catch (error) {
            setGeneratedScreens(prevScreens => {
                const newScreens = [...prevScreens];
                if (newScreens[index]) {
                    newScreens[index] = { ...newScreens[index], status: 'error' };
                }
                return newScreens;
            });
        }
    };

    const generateAppFlow = async () => {
        if (!appIdea.trim()) {
            setError('Please describe your app idea first!');
            return;
        }
        setCurrentStep('loading');
        setError(null);
        setIsGenerating(true);
        setProgress(10);
        setCurrentPhase('Analyzing your vision...');

        // Play magical sound effect
        playMagicalSound();

        try {
            const flowPrompt = `You are an expert app designer. Create a complete app flow for this idea:
APP IDEA: ${appIdea}
TYPE: ${appType}
STYLE: ${designStyle}

Generate a JSON response with this structure:
{
  "appName": "Creative app name",
  "description": "Brief app description",
  "screens": [
    {
      "id": "screen_1",
      "name": "Screen name",
      "type": "onboarding/main/detail/etc",
      "description": "What this screen does",
      "elements": ["Button", "Header", "Card", "etc"],
      "position": { "x": 0, "y": 0 }
    }
  ]
}
Create ${screenCount} key screens. Calculate logical x/y positions.`;

            const flowResponse = await callGrokAPI(flowPrompt);
            setProgress(50);

            const cleanResponse = flowResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsedFlowData = JSON.parse(cleanResponse);

            const COLUMNS = Math.ceil(Math.sqrt(parsedFlowData.screens.length));
            const dims = getScreenDimensions(appType);
            const X_SPACING = dims.width + 150;
            const Y_SPACING = dims.height + 150;

            parsedFlowData.screens = parsedFlowData.screens.map((screen, index) => ({
                ...screen,
                position: {
                    x: (index % COLUMNS) * X_SPACING + 100,
                    y: Math.floor(index / COLUMNS) * Y_SPACING + 100
                },
                status: index < 6 ? 'generating' : 'draft',
                html: null
            }));

            setCanvasPosition({ x: 0, y: 0 });
            setFlowData(parsedFlowData);
            setGeneratedScreens(parsedFlowData.screens);
            setCurrentStep('results');
            setIsGenerating(false);

            // Show LaserFlow overlay on results page
            setShowResultsLaserFlow(true);

            // Fade out LaserFlow after 12 seconds for dramatic reveal
            setTimeout(() => {
                setShowResultsLaserFlow(false);
            }, 12000);

            // Show LaserFlow overlay on results page
            setShowResultsLaserFlow(true);

            // Fade out LaserFlow after 12 seconds for dramatic reveal
            setTimeout(() => {
                setShowResultsLaserFlow(false);
            }, 12000);

            // Trigger generation for first 6 screens
            parsedFlowData.screens.forEach((screen, index) => {
                if (index < 6) {
                    fetchScreenUI(index, screen);
                }
            });
        } catch (error) {
            setError(error.message);
            setCurrentStep('prompt');
            setIsGenerating(false);
        }
    };

    const generateScreenUI = async (index) => {
        const screen = generatedScreens[index];
        if (screen.status === 'generating' || screen.status === 'completed') return;

        setGeneratedScreens(prev => {
            const newScreens = [...prev];
            newScreens[index] = { ...newScreens[index], status: 'generating' };
            return newScreens;
        });

        await fetchScreenUI(index, screen);
    };

    const handleRegenerate = (index) => {
        const newScreens = [...generatedScreens];
        newScreens[index] = { ...newScreens[index], status: 'draft', html: null };
        setGeneratedScreens(newScreens);
    };

    const handleScreenDescriptionChange = (index, newDescription) => {
        const newScreens = [...generatedScreens];
        newScreens[index] = { ...newScreens[index], description: newDescription };
        setGeneratedScreens(newScreens);
    };

    const handleAutoLayout = () => {
        const COLUMNS = Math.ceil(Math.sqrt(generatedScreens.length));
        const dims = getScreenDimensions(appType);
        const X_SPACING = dims.width + 150;
        const Y_SPACING = dims.height + 150;

        const reorganizedScreens = generatedScreens.map((screen, index) => ({
            ...screen,
            position: {
                x: (index % COLUMNS) * X_SPACING + 100,
                y: Math.floor(index / COLUMNS) * Y_SPACING + 100
            }
        }));

        setGeneratedScreens(reorganizedScreens);
        setCanvasPosition({ x: 0, y: 0 });
    };

    const addStickyNote = () => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const centerX = -canvasPosition.x + (rect.width / 2 / zoom);
        const centerY = -canvasPosition.y + (rect.height / 2 / zoom);

        setStickyNotes([...stickyNotes, {
            id: Date.now(),
            text: "New Note",
            position: { x: centerX, y: centerY },
            color: "#fef3c7"
        }]);
    };

    const addNewFrame = () => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const centerX = -canvasPosition.x + (rect.width / 2 / zoom);
        const centerY = -canvasPosition.y + (rect.height / 2 / zoom);

        const newScreen = {
            id: `screen_${Date.now()}`,
            name: `New Screen ${generatedScreens.length + 1}`,
            type: 'Custom',
            description: 'Describe this screen...',
            elements: [],
            position: { x: centerX, y: centerY },
            status: 'draft',
            html: null
        };
        setGeneratedScreens([...generatedScreens, newScreen]);
    };

    const deleteScreen = (index) => {
        const newScreens = [...generatedScreens];
        newScreens.splice(index, 1);
        setGeneratedScreens(newScreens);
    };

    const updateStickyNote = (id, newText) => {
        setStickyNotes(stickyNotes.map(note =>
            note.id === id ? { ...note, text: newText } : note
        ));
    };

    const handleMouseDown = (e, type, index = null) => {
        if (isConnecting) return;

        // Tool Handling
        if (activeTool === 'hand' || (activeTool !== 'hand' && e.code === 'Space')) {
            setDragState({
                isDragging: true,
                type: 'canvas',
                startX: e.clientX,
                startY: e.clientY,
                targetIndex: null,
                initialX: canvasPosition.x,
                initialY: canvasPosition.y
            });
            return;
        }

        if (activeTool === 'eraser') {
            if (type === 'screen') {
                deleteScreen(index);
            } else if (type === 'note') {
                setStickyNotes(stickyNotes.filter(n => n.id !== index));
            }
            return;
        }

        // Magic Wand click handled by iframe/html script generally, but for parent objects:
        if (activeTool === 'wand' && type === 'screen') {
            // Select screen for regeneration? 
            // Maybe just open regenerate mode?
            return;
        }

        if (type === 'canvas' || e.button === 1) {
            setDragState({
                isDragging: true,
                type: 'canvas',
                startX: e.clientX,
                startY: e.clientY,
                targetIndex: null,
                initialX: canvasPosition.x,
                initialY: canvasPosition.y
            });
            return;
        }

        if (type === 'screen' && !isPrototypeMode) {
            e.stopPropagation();
            setDragState({
                isDragging: true,
                type: 'screen',
                startX: e.clientX,
                startY: e.clientY,
                targetIndex: index,
                initialX: generatedScreens[index].position.x,
                initialY: generatedScreens[index].position.y
            });
        } else if (type === 'note') {
            e.stopPropagation();
            setDragState({
                isDragging: true,
                type: 'note',
                startX: e.clientX,
                startY: e.clientY,
                targetIndex: index,
                initialX: stickyNotes.find(n => n.id === index).position.x,
                initialY: stickyNotes.find(n => n.id === index).position.y
            });
        }
    };

    // ... handleMouseMove, handleMouseUp ... (Keep same logic)
    const handleMouseMove = (e) => {
        if (isConnecting) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                setMousePos({
                    x: (e.clientX - rect.left - canvasPosition.x) / zoom,
                    y: (e.clientY - rect.top - canvasPosition.y) / zoom
                });
            }
        }

        if (!dragState.isDragging) return;

        const dx = (e.clientX - dragState.startX);
        const dy = (e.clientY - dragState.startY);

        if (dragState.type === 'canvas') {
            setCanvasPosition({
                x: dragState.initialX + dx,
                y: dragState.initialY + dy
            });
        } else if (dragState.type === 'screen') {
            const newScreens = [...generatedScreens];
            newScreens[dragState.targetIndex].position = {
                x: dragState.initialX + (dx / zoom),
                y: dragState.initialY + (dy / zoom)
            };
            setGeneratedScreens(newScreens);
        } else if (dragState.type === 'note') {
            const newNotes = stickyNotes.map(note => {
                if (note.id === dragState.targetIndex) {
                    return {
                        ...note,
                        position: {
                            x: dragState.initialX + (dx / zoom),
                            y: dragState.initialY + (dy / zoom)
                        }
                    };
                }
                return note;
            });
            setStickyNotes(newNotes);
        }
    };

    const handleMouseUp = () => {
        setDragState({ isDragging: false, type: null, startX: 0, startY: 0, targetIndex: null, initialX: 0, initialY: 0 });
        if (isConnecting && !connectionStart) {
            setIsConnecting(false);
        }
    };

    // ... startConnection, completeConnection ... (Keep same)
    const startConnection = (e, screenIndex) => {
        e.stopPropagation();
        const screen = generatedScreens[screenIndex];
        const dims = getScreenDimensions(appType);
        setConnectionStart({
            screenIndex,
            startX: screen.position.x + dims.width,
            startY: screen.position.y + dims.height / 2
        });
        setIsConnecting(true);
    };

    const completeConnection = (e, targetScreenIndex) => {
        e.stopPropagation();
        if (connectionStart && connectionStart.screenIndex !== targetScreenIndex) {
            setConnections([...connections, {
                from: connectionStart.screenIndex,
                to: targetScreenIndex,
                fromElement: connectionStart.elementId,
                startCoords: { x: connectionStart.startX, y: connectionStart.startY } // Optional custom start
            }]);
        }
        setConnectionStart(null);
        setIsConnecting(false);
    };

    const startNewFlow = () => {
        setCurrentStep('prompt');
        setAppIdea('');
        setGeneratedScreens([]);
        setFlowData(null);
        setError(null);
        setProgress(0);
        setIsGenerating(false);
        setCurrentPhase('');
        setCanvasPosition({ x: 0, y: 0 });
        setZoom(0.6);
        setConnections([]);
        setStickyNotes([]);
    };

    const handleResetView = () => {
        setCanvasPosition({ x: 0, y: 0 });
        setZoom(0.6);
    };

    const handleExportVectorPDF = () => {
        const printWindow = window.open('', '_blank');

        const screensHtml = generatedScreens.map((screen, index) => `
            <div class="screen-wrapper">
                <div class="screen-label">Screen ${index + 1}: ${screen.name}</div>
                <div class="screen-content" style="width: ${getScreenDimensions(appType).width}px; height: ${getScreenDimensions(appType).height}px;">
                    ${screen.html || '<div>Generating...</div>'}
                </div>
            </div>
        `).join('');

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${appIdea} - Vector Export</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print {
                        @page { size: auto; margin: 0mm; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                        .screen-wrapper { break-inside: avoid; page-break-inside: avoid; margin-bottom: 40px; }
                    }
                    body { font-family: sans-serif; padding: 40px; }
                    .screen-wrapper { margin-bottom: 60px; }
                    .screen-label { font-weight: bold; color: #666; margin-bottom: 10px; }
                    .screen-content { border: 1px solid #eee; border-radius: 12px; overflow: hidden; position: relative; background: white; }
                </style>
            </head>
            <body>
                <div style="text-align: center; margin-bottom: 40px;">
                    <h1 style="font-size: 24px; font-weight: bold;">${appIdea}</h1>
                    <p style="color: #666;">1. Right-click > "Print" or Ctrl/Cmd+P<br>2. Destination: "Save as PDF"<br>3. Drag the PDF into Figma to edit layers.</p>
                </div>
                ${screensHtml}
                <script>
                    // Auto-trigger print after Tailwind loads
                    setTimeout(() => {
                        window.print();
                    }, 1500);
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    return (
        <div className={`min-h-screen w-full relative overflow-hidden font-sans transition-colors duration-300 ${darkMode ? 'bg-[#060010] text-white' : 'bg-gray-50 text-black'}`}>
            <FluidCursor isAnalyzing={isAnalyzing} showAi={showAi} />

            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-300 ${darkMode ? 'bg-black/50 border-white/10' : 'bg-white/90 border-gray-200'}`}>
                {/* ... Keep Nav content ... */}
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div>
                            <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>FlowCraft</h1>
                            <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Canvas Studio</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {currentStep === 'results' && (
                            <div className="flex items-center space-x-4">
                                {/* ... Existing Results Nav Buttons ... */}
                                <div className={`flex items-center rounded-lg p-1 mr-4 ${darkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <button
                                        onClick={() => setIsPrototypeMode(false)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${!isPrototypeMode ? (darkMode ? 'bg-white/20 text-white' : 'bg-white shadow-sm text-black') : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black')}`}
                                    >
                                        Design
                                    </button>
                                    <button
                                        onClick={() => setIsPrototypeMode(true)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${isPrototypeMode ? 'bg-indigo-500 shadow-sm text-white' : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black')}`}
                                    >
                                        Prototype
                                    </button>
                                </div>

                                <button onClick={handleAutoLayout} className={`px-3 py-2 rounded-lg font-bold text-sm hover:opacity-80 ${darkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-black'}`}>Layout</button>
                                <button onClick={startNewFlow} className={`px-4 py-2 rounded-lg font-bold text-sm ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>New Flow</button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <div className={`pt-20 h-screen w-full relative ${darkMode ? 'bg-black' : 'bg-white'}`}>

                {/* 3D Tool Buttons (Bottom Center) */}
                {currentStep === 'results' && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-4">
                        <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-gray-200 flex gap-2 items-center">
                            <ThreeDButton
                                onClick={() => setActiveTool('hand')}
                                isActive={activeTool === 'hand'}
                                title="Hand Tool (Pan)"
                                className="w-12 h-12"
                            >
                                <Hand size={20} />
                            </ThreeDButton>
                            <ThreeDButton
                                onClick={() => setActiveTool('select')}
                                isActive={activeTool === 'select'}
                                title="Selection Tool"
                                className="w-12 h-12"
                            >
                                <MousePointer2 size={20} />
                            </ThreeDButton>
                            <div className="w-px bg-gray-300 mx-1 h-8 self-center"></div>
                            <ThreeDButton
                                onClick={() => setActiveTool('wand')}
                                isActive={activeTool === 'wand'}
                                title="Magic Wand (Edit Elements)"
                                className="w-12 h-12"
                            >
                                <Wand2 size={20} className="text-purple-600" />
                            </ThreeDButton>
                            <ThreeDButton
                                onClick={() => setActiveTool('eraser')}
                                isActive={activeTool === 'eraser'}
                                title="Eraser (Delete)"
                                className="w-12 h-12"
                            >
                                <Eraser size={20} className="text-red-500" />
                            </ThreeDButton>
                            <div className="w-px bg-gray-300 mx-1 h-8 self-center"></div>
                            <ThreeDButton
                                onClick={addNewFrame}
                                title="Add New Frame"
                                className="w-12 h-12"
                            >
                                <PlusSquare size={20} />
                            </ThreeDButton>
                            <ThreeDButton
                                onClick={addStickyNote}
                                title="Add Sticky Note"
                                className="w-12 h-12"
                            >
                                <StickyNote size={20} />
                            </ThreeDButton>
                            <ThreeDButton
                                onClick={() => setShowAi(!showAi)}
                                isActive={showAi}
                                title={showAi ? "Disable AI Companion" : "Enable AI Companion"}
                                className="w-12 h-12"
                            >
                                <Bot size={20} className={showAi ? "text-indigo-600" : "text-gray-400"} />
                            </ThreeDButton>
                            <div className="w-px bg-gray-300 mx-1 h-8 self-center"></div>
                            <ThreeDButton
                                onClick={() => handleResearch('user')}
                                title="User Research"
                                className="w-12 h-12"
                            >
                                <Users size={20} className="text-blue-600" />
                            </ThreeDButton>
                            <ThreeDButton
                                onClick={() => handleResearch('competitor')}
                                title="Competitor Analysis"
                                className="w-12 h-12"
                            >
                                <Globe size={20} className="text-green-600" />
                            </ThreeDButton>
                            <div className="w-px bg-gray-300 mx-1 h-8 self-center"></div>
                            <ThreeDButton
                                onClick={handleExportVectorPDF}
                                title="Export Vector PDF (Figma Ready)"
                                className="w-12 h-12"
                            >
                                <Download size={20} className="text-red-600" />
                            </ThreeDButton>
                        </div>
                    </div>
                )}

                {/* Zoom Controls */}
                {currentStep === 'results' && (
                    <div className="fixed bottom-8 right-8 z-[90] flex flex-col gap-2">
                        <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-gray-200 flex flex-col gap-2 items-center">
                            <ThreeDButton
                                onClick={handleZoomIn}
                                title="Zoom In"
                                className="w-10 h-10"
                            >
                                <ZoomIn size={20} />
                            </ThreeDButton>
                            <ThreeDButton
                                onClick={handleZoomOut}
                                title="Zoom Out"
                                className="w-10 h-10"
                            >
                                <ZoomOut size={20} />
                            </ThreeDButton>
                            <div className="text-xs font-bold text-gray-500">{Math.round(zoom * 100)}%</div>
                        </div>
                    </div>
                )
                }

                {/* AI Analysis Overlay ... (Keep existing) */}
                {
                    showAnalysis && analysisResults && showAi && (
                        <div className="fixed bottom-28 right-8 z-[100]">
                            <CardSpotlight className="w-80 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                                {/* ... Content ... */}
                                <div className="bg-neutral-900/50 p-4 flex justify-between items-center relative z-20 border-b border-white/10">
                                    <h3 className="font-bold text-white flex items-center gap-2">Co-pilot Insights</h3>
                                    <button onClick={() => setShowAnalysis(false)} className="text-neutral-400 hover:text-white"><X size={16} /></button>
                                </div>
                                <div className="p-6 max-h-[60vh] overflow-y-auto relative z-20 bg-black/20">
                                    <div className="space-y-6">
                                        {analysisResults.map((item, i) => (
                                            <div key={i} className="group">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 font-bold text-xs text-indigo-400 mt-0.5 shadow-[0_0_10px_rgba(99,102,241,0.3)]">{i + 1}</div>
                                                    <h4 className="font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                                                </div>
                                                <p className="text-sm text-neutral-400 pl-9 leading-relaxed">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardSpotlight>
                        </div>
                    )
                }

                {/* Research Modal */}
                {
                    showResearch && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${researchType === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                            {researchType === 'user' ? <Users size={24} /> : <Globe size={24} />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-black">
                                                {researchType === 'user' ? 'User Research' : 'Competitor Analysis'}
                                            </h2>
                                            <p className="text-sm text-gray-500">Powered by Perplexity Sonar</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowResearch(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 bg-white">
                                    {isResearching ? (
                                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <p className="text-gray-500 font-medium animate-pulse">Gathering intelligence...</p>
                                        </div>
                                    ) : researchData[researchType] ? (
                                        <div className="prose prose-lg max-w-none">
                                            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                                {researchData[researchType].content}
                                            </div>

                                            {researchData[researchType].citations && researchData[researchType].citations.length > 0 && (
                                                <div className="mt-8 pt-8 border-t border-gray-100">
                                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Sources & Citations</h4>
                                                    <div className="grid gap-2">
                                                        {researchData[researchType].citations.map((citation, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={citation}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50 p-2 rounded-lg transition-colors"
                                                            >
                                                                <span className="w-5 h-5 flex items-center justify-center bg-indigo-100 rounded text-xs font-bold shrink-0">{idx + 1}</span>
                                                                <span className="truncate">{citation}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500">No data available.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* ... Prompt & Loading ... */}
                {
                    currentStep === 'prompt' && (
                        <div
                            className="relative w-full h-full flex flex-col items-center justify-start pt-20 overflow-y-auto overflow-x-hidden"
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const y = e.clientY - rect.top;
                                const revealEl = document.getElementById('laser-reveal-overlay');
                                if (revealEl) {
                                    revealEl.style.setProperty('--mx', `${x}px`);
                                    revealEl.style.setProperty('--my', `${y}px`);
                                }
                            }}
                            onMouseLeave={() => {
                                const revealEl = document.getElementById('laser-reveal-overlay');
                                if (revealEl) {
                                    revealEl.style.setProperty('--mx', '-9999px');
                                    revealEl.style.setProperty('--my', '-9999px');
                                }
                            }}
                        >
                            {/* LaserFlow Background */}
                            <div className="absolute inset-0 z-0 opacity-100">
                                <LaserFlow
                                    key="landing-laser"
                                    color={darkMode ? "#FF79C6" : "#3b82f6"}
                                    flowSpeed={0.45}
                                    horizontalBeamOffset={0.05}
                                    verticalBeamOffset={0.0}
                                    fogIntensity={0.65}
                                    wispDensity={1.4}
                                    wispIntensity={5.0}
                                    wispSpeed={15.5}
                                    verticalSizing={2.3}
                                    horizontalSizing={0.8}
                                    decay={1.4}
                                    falloffStart={1.55}
                                    flowStrength={0.35}
                                />
                            </div>

                            {/* Interactive Reveal Overlay */}
                            <div
                                id="laser-reveal-overlay"
                                className="absolute inset-0 z-[1] pointer-events-none"
                                style={{
                                    background: darkMode
                                        ? 'radial-gradient(circle 300px at var(--mx, -9999px) var(--my, -9999px), rgba(255, 121, 198, 0.15), transparent 70%)'
                                        : 'radial-gradient(circle 300px at var(--mx, -9999px) var(--my, -9999px), rgba(59, 130, 246, 0.15), transparent 70%)',
                                    '--mx': '-9999px',
                                    '--my': '-9999px',
                                    mixBlendMode: 'screen'
                                }}
                            />
                            <div className="relative z-10 max-w-5xl w-full px-6 flex flex-col items-center text-center">
                                <div className="mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                                    <h1 className={`text-6xl md:text-8xl font-black tracking-tighter mb-6 ${darkMode ? 'text-white' : 'text-black'}`}>
                                        Design apps in seconds
                                    </h1>
                                    <p className={`text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Generate beautiful app mockups with AI and iterate on your ideas instantly.
                                    </p>
                                </div>

                                <div className={`w-full max-w-3xl backdrop-blur-xl rounded-3xl p-8 shadow-2xl border ${darkMode ? 'bg-black/40 border-white/10' : 'bg-white/80 border-gray-200'}`}>
                                    <div className="space-y-6">
                                        <div>
                                            <label className={`block text-sm font-bold mb-3 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Describe your app idea</label>
                                            <textarea
                                                value={appIdea}
                                                onChange={(e) => setAppIdea(e.target.value)}
                                                className={`w-full rounded-2xl p-6 text-lg h-32 border-2 outline-none transition-all ${darkMode ? 'bg-black/50 border-white/10 focus:border-purple-500 text-white placeholder-gray-600' : 'bg-white border-gray-200 focus:border-black text-black placeholder-gray-400'}`}
                                                placeholder="e.g. A fitness tracking app with social features..."
                                            />
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={`block text-sm font-bold mb-3 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Platform</label>
                                                <select
                                                    value={appType}
                                                    onChange={(e) => setAppType(e.target.value)}
                                                    className={`w-full rounded-2xl px-6 py-4 border-2 outline-none appearance-none ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}
                                                >
                                                    <option>Web App</option><option>Mobile App</option><option>SaaS Dashboard</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-bold mb-3 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Style</label>
                                                <select
                                                    value={designStyle}
                                                    onChange={(e) => setDesignStyle(e.target.value)}
                                                    className={`w-full rounded-2xl px-6 py-4 border-2 outline-none appearance-none ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}
                                                >
                                                    <option>Modern & Minimal</option><option>Glassmorphism</option><option>Brutalism</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-bold mb-4 uppercase tracking-wider text-left ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Number of Screens: {screenCount}
                                            </label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="30"
                                                value={screenCount}
                                                onChange={(e) => setScreenCount(parseInt(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>

                                        {error && <p className="text-red-500">{error}</p>}

                                        <button
                                            onClick={generateAppFlow}
                                            disabled={isGenerating}
                                            className={`w-full py-6 rounded-2xl font-black text-xl hover:scale-[1.02] transition-transform shadow-lg ${darkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-900'}`}
                                        >
                                            {isGenerating ? 'Architecting Vision...' : 'Generate App Canvas'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* ... Loading ... */}
                {
                    currentStep === 'loading' && (
                        <div className={`absolute inset-0 flex items-center justify-center z-40 ${darkMode ? 'bg-black' : 'bg-white'}`}>
                            {/* LaserFlow Background */}
                            <div className="absolute inset-0 z-0 opacity-80">
                                <LaserFlow
                                    key="loading-laser"
                                    color={darkMode ? "#FF79C6" : "#3b82f6"}
                                    flowSpeed={0.6}
                                    fogIntensity={0.7}
                                    wispDensity={1.5}
                                    wispIntensity={6.0}
                                    verticalSizing={2.5}
                                    horizontalSizing={0.9}
                                />
                            </div>

                            {/* Loading UI */}
                            <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                                <h2 className={`text-5xl font-black mb-8 ${darkMode ? 'text-white' : 'text-black'}`}>AI is Architecting</h2>
                                <p className={`text-xl mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{currentPhase}</p>
                                <div className="max-w-2xl mx-auto">
                                    <div className={`rounded-full h-4 mb-6 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                                        <div
                                            className={`h-4 rounded-full transition-all duration-1000 shadow-lg ${darkMode ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500' : 'bg-black'}`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <p className={`text-sm font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{Math.round(progress)}%</p>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    currentStep === 'results' && (
                        <>
                            {/* LaserFlow Dramatic Reveal Overlay */}
                            {showResultsLaserFlow && (
                                <div
                                    className="fixed inset-0 z-[100] pointer-events-none transition-opacity duration-[3000ms]"
                                    style={{ opacity: showResultsLaserFlow ? 1 : 0 }}
                                >
                                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
                                    <div className="absolute inset-0 opacity-80">
                                        <LaserFlow
                                            color={darkMode ? "#FF79C6" : "#3b82f6"}
                                            flowSpeed={0.5}
                                            fogIntensity={0.8}
                                            wispDensity={1.8}
                                            wispIntensity={7.0}
                                            verticalSizing={2.8}
                                            horizontalSizing={1.0}
                                        />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center animate-pulse">
                                            <h2 className="text-6xl font-black text-white mb-4">Materializing Vision...</h2>
                                            <p className="text-2xl text-white/80">Your designs are coming to life</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div
                                ref={canvasRef}
                                className={`w-full h-full bg-gray-50 overflow-hidden ${activeTool === 'hand' || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} canvas-bg`}
                                onMouseDown={(e) => handleMouseDown(e, 'canvas')}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                style={{
                                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: `${canvasPosition.x}px ${canvasPosition.y}px`,
                                    cursor: activeTool === 'eraser' ? 'not-allowed' : (activeTool === 'wand' ? 'crosshair' : 'auto')
                                }}
                            >
                                <div
                                    className="relative transition-transform duration-100 ease-out origin-center"
                                    style={{
                                        transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoom})`,
                                    }}
                                >
                                    {/* Magic Edit Overlay inside scaled context */}
                                    {magicSelection && (
                                        <div
                                            className="absolute z-[999]"
                                            style={{
                                                left: generatedScreens[magicSelection.screenIndex].position.x + magicSelection.rect.left,
                                                top: generatedScreens[magicSelection.screenIndex].position.y + magicSelection.rect.top + 60, // offset for header
                                            }}
                                        >
                                            <div className="relative">
                                                <div className="absolute -top-12 left-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-bounce">
                                                    Magic Edit Active
                                                </div>
                                                <div className="w-64 bg-white rounded-xl shadow-2xl border-2 border-purple-500 p-2 flex flex-col gap-2 animate-in zoom-in duration-200">
                                                    <textarea
                                                        autoFocus
                                                        placeholder="Describe change (e.g., 'Make blue')"
                                                        className="w-full text-sm p-2 bg-gray-50 rounded-lg outline-none resize-none text-black"
                                                        rows={2}
                                                        value={magicSelection.prompt}
                                                        onChange={(e) => setMagicSelection({ ...magicSelection, prompt: e.target.value })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); applyMagicEdit(); } }}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setMagicSelection(null)} className="text-xs text-gray-500 font-bold hover:text-black px-2">Cancel</button>
                                                        <button onClick={applyMagicEdit} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-1">
                                                            {isMagicEditing ? <span className="animate-spin">⏳</span> : <Wand2 size={12} />}
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* Highlight box matching element size */}
                                                <div
                                                    className="absolute border-2 border-purple-500 rounded pointer-events-none bg-purple-500/10"
                                                    style={{
                                                        top: 0,
                                                        left: 0,
                                                        width: magicSelection.rect.width,
                                                        height: magicSelection.rect.height,
                                                        transform: 'translateY(-60px)' // counteract the offset we added for the input box
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ... Connections ... */}
                                    <svg className="absolute top-0 left-0 w-[50000px] h-[50000px] pointer-events-none z-0">
                                        <defs>
                                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                                            </marker>
                                        </defs>
                                        {connections.map((conn, i) => {
                                            const startScreen = generatedScreens[conn.from];
                                            const endScreen = generatedScreens[conn.to];
                                            if (!startScreen || !endScreen) return null;
                                            const dims = getScreenDimensions(appType);
                                            let startX = startScreen.position.x + dims.width;
                                            let startY = startScreen.position.y + dims.height / 2;
                                            if (conn.startCoords) {
                                                startX = conn.startCoords.x;
                                                startY = conn.startCoords.y;
                                            }
                                            const endX = endScreen.position.x;
                                            const endY = endScreen.position.y + dims.height / 2;
                                            const dist = Math.abs(endX - startX);
                                            const controlOffset = Math.max(dist * 0.5, 150);
                                            const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
                                            return (
                                                <path
                                                    key={i} d={path} stroke="#6366f1" strokeWidth="4" fill="none" markerEnd="url(#arrowhead)"
                                                    className="opacity-80 hover:opacity-100 transition-opacity drop-shadow-md"
                                                />
                                            );
                                        })}
                                        {isConnecting && connectionStart && (
                                            <path
                                                d={`M ${connectionStart.startX} ${connectionStart.startY} L ${mousePos.x} ${mousePos.y}`}
                                                stroke="#6366f1" strokeWidth="4" strokeDasharray="8,8" fill="none" className="animate-pulse"
                                            />
                                        )}
                                    </svg>

                                    {/* ... Sticky Notes ... */}
                                    {stickyNotes.map((note) => (
                                        <div
                                            key={note.id}
                                            className={`absolute w-60 h-60 p-4 rounded-xl shadow-xl transition-transform cursor-grab active:cursor-grabbing hover:scale-105 z-40`}
                                            style={{
                                                left: note.position.x,
                                                top: note.position.y,
                                                backgroundColor: note.color,
                                                transform: `rotate(${note.id % 6 - 3}deg)`,
                                                border: activeTool === 'eraser' ? '2px dashed red' : 'none'
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, 'note', note.id)}
                                        >
                                            <div className="h-full flex flex-col">
                                                <textarea
                                                    value={note.text}
                                                    onChange={(e) => updateStickyNote(note.id, e.target.value)}
                                                    className="w-full h-full bg-transparent resize-none outline-none text-gray-800 font-handwriting text-lg placeholder-gray-400"
                                                    placeholder="Write a note..."
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {generatedScreens.map((screen, index) => {
                                        const dims = getScreenDimensions(appType);
                                        const isCompleted = screen.status === 'completed';

                                        return (
                                            <div
                                                key={index}
                                                className={`absolute rounded-[24px] transition-all duration-200 group ${dragState.type === 'screen' && dragState.targetIndex === index ? 'z-50 scale-[1.02] cursor-grabbing' : 'z-10'}`}
                                                style={{
                                                    left: screen.position?.x || 0,
                                                    top: screen.position?.y || 0,
                                                    width: dims.width,
                                                    cursor: activeTool === 'eraser' ? 'pointer' : 'default',
                                                    filter: activeTool === 'eraser' && dragState.targetIndex === index ? 'grayscale(100%) opacity(50%)' : 'none' // Visual feedback for potential delete
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (activeTool === 'eraser') e.currentTarget.style.boxShadow = '0 0 0 4px red';
                                                    else if (activeTool === 'select') e.currentTarget.style.boxShadow = '0 0 0 4px #3b82f6';
                                                }}
                                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                {isCompleted ? (
                                                    <BackgroundGradient
                                                        containerClassName="rounded-[24px] h-full"
                                                        className="rounded-[22px] bg-white h-full overflow-hidden relative"
                                                    >
                                                        <div
                                                            className={`p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-[20px] transition-colors ${!isPrototypeMode && activeTool === 'select' ? 'cursor-grab active:cursor-grabbing hover:bg-gray-100' : ''}`}
                                                            onMouseDown={(e) => handleMouseDown(e, 'screen', index)}
                                                        >
                                                            <div className="flex items-center space-x-3">
                                                                <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">{index + 1}</span>
                                                                <h3 className="font-bold text-lg truncate w-64">{screen.name}</h3>
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm uppercase tracking-wider">{screen.type}</span>
                                                        </div>

                                                        <div
                                                            className="bg-gray-100 relative group overflow-hidden rounded-b-[20px]"
                                                            style={{ height: dims.height }}
                                                        >
                                                            {/* Fallback Connector */}
                                                            {isPrototypeMode && (
                                                                <div
                                                                    className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 z-50 cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onMouseDown={(e) => startConnection(e, index)}
                                                                >
                                                                    <PulsingGlow active={true}>
                                                                        <div className="w-8 h-8 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                                                                            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                                                                        </div>
                                                                    </PulsingGlow>
                                                                </div>
                                                            )}

                                                            {/* Drop Zone */}
                                                            {isConnecting && connectionStart?.screenIndex !== index && (
                                                                <div
                                                                    className="absolute left-0 top-0 w-full h-full z-[100] cursor-pointer"
                                                                    onMouseUp={(e) => {
                                                                        e.stopPropagation();
                                                                        completeConnection(e, index);
                                                                    }}
                                                                >
                                                                    <GlowingEffect spread={60} glow={true} disabled={false} proximity={100} inactiveZone={0.01} className="rounded-[20px]" />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 border-4 border-indigo-500/50 rounded-[20px]">
                                                                        <span className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg text-lg animate-bounce">Link Screen</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {screen.html && (
                                                                <div className="h-full w-full relative">
                                                                    <iframe
                                                                        title={screen.name}
                                                                        srcDoc={getAugmentedHTML(screen.html, index)}
                                                                        className={`w-full h-full border-none ${isPrototypeMode || activeTool === 'wand' || activeTool === 'eraser' ? 'pointer-events-auto' : 'pointer-events-none'}`}
                                                                    />

                                                                    {/* Cover div for dragging */}
                                                                    {!isPrototypeMode && activeTool === 'select' && (
                                                                        <div className="absolute inset-0 bg-transparent hover:bg-black/5 transition-colors cursor-grab active:cursor-grabbing"
                                                                            onMouseDown={(e) => handleMouseDown(e, 'screen', index)}
                                                                        ></div>
                                                                    )}

                                                                    {/* Regenerate Button */}
                                                                    {!isPrototypeMode && activeTool === 'select' && (
                                                                        <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleRegenerate(index); }}
                                                                                className="bg-white text-black px-4 py-2 rounded-lg shadow-xl hover:bg-black hover:text-white transition-all transform hover:scale-105 border border-gray-200 font-bold text-sm flex items-center space-x-2"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                                                <span>Regenerate</span>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </BackgroundGradient>
                                                ) : (
                                                    <CometCard className="rounded-[22px] bg-white p-1">
                                                        <div
                                                            className={`p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-[20px] transition-colors ${!isPrototypeMode && activeTool === 'select' ? 'cursor-grab active:cursor-grabbing hover:bg-gray-100' : ''}`}
                                                            onMouseDown={(e) => handleMouseDown(e, 'screen', index)}
                                                        >
                                                            <div className="flex items-center space-x-3">
                                                                <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">{index + 1}</span>
                                                                <h3 className="font-bold text-lg truncate w-64">{screen.name}</h3>
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm uppercase tracking-wider">{screen.type}</span>
                                                        </div>

                                                        <div
                                                            className="bg-gray-100 relative group overflow-hidden rounded-b-[20px]"
                                                            style={{ height: dims.height }}
                                                        >
                                                            <div className="h-full w-full flex flex-col items-center justify-center bg-white p-8">
                                                                {screen.status === 'generating' ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-4"></div>
                                                                        <p className="text-lg font-bold text-black">Generating...</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center w-full h-full">
                                                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 shrink-0">
                                                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                        </div>
                                                                        <h4 className="font-bold text-xl mb-2 text-black shrink-0">Blueprint Ready</h4>
                                                                        <div className="w-full relative group mb-6 grow flex flex-col">
                                                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">AI Prompt (Editable)</label>
                                                                            <textarea
                                                                                value={screen.description}
                                                                                onChange={(e) => handleScreenDescriptionChange(index, e.target.value)}
                                                                                className="w-full grow bg-gray-50 rounded-xl p-4 text-sm text-gray-600 border-2 border-transparent hover:border-gray-200 focus:border-black focus:bg-white transition-all outline-none resize-none"
                                                                                placeholder="Describe the UI..."
                                                                            />
                                                                        </div>
                                                                        <button onClick={() => generateScreenUI(index)} className="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform shrink-0 w-full flex items-center justify-center space-x-2">
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                            <span>Generate Design</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CometCard>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )
                }
            </div >
        </div >
    );
}

export default App;