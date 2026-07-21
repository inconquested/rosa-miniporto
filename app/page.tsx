'use client';
import { useState } from 'react';
import { cn } from "@/lib/utils";
import { FloorPlanViewer } from '@/components/floor-plan-viewer';
import { Button } from "@/components/ui/button"
import { calculateBudget } from '@/lib/budget-calculator';
import { FloorPlanData, BudgetData } from '@/types';
import { InputGroup, InputGroupAddon, InputGroupTextarea, InputGroupButton } from '@/components/ui/input-group';
import { MicrophoneIcon, ArrowUpIcon, SquareIcon } from '@phosphor-icons/react';

// Minimal typings for the Web Speech API (not part of the standard DOM lib)
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternative>;
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
}
type SpeechWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export default function Home() {
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [input, setInput] = useState('');
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);

  const SAMPLE_DATA: FloorPlanData = {
    "rooms": [
      { "type": "living_room", "area": 70, "width": 10, "height": 7, "x": 5, "y": 0 },
      { "type": "kitchen", "area": 25, "width": 5, "height": 5, "x": 0, "y": 0 },
      { "type": "foyer", "area": 10, "width": 5, "height": 2, "x": 0, "y": 5 },
      { "type": "hallway", "area": 30, "width": 15, "height": 2, "x": 0, "y": 7 },
      { "type": "bedroom", "area": 15, "width": 5, "height": 3, "x": 0, "y": 9 },
      { "type": "bedroom", "area": 15, "width": 5, "height": 3, "x": 5, "y": 9 },
      { "type": "bathroom", "area": 15, "width": 5, "height": 3, "x": 10, "y": 9 }
    ],
    "totalArea": 180,
    "totalWidth": 15,
    "totalHeight": 12,
    "notes": "A spacious 180m2 floor plan featuring a large open-concept living and dining area, a separate kitchen, two bedrooms, and a central hallway connecting all spaces efficiently."
  };

  const handleLoadSample = () => {
    setError('');
    setFloorPlan(SAMPLE_DATA);
    setBudget(calculateBudget(SAMPLE_DATA.rooms));
  };

  const handleSpeechInput = () => {
    const lang = navigator.language;
    const w = window as SpeechWindow;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      setError(`Speech error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleClearFloorplan = () => {
    setFloorPlan(null);
    setInput('');
    setBudget(null);
    setError('');
  }

  const handleGenerate = async (desc: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate/floor-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc })
      });
      const data = await res.json();

      if (data.error) {
        // Special handling for quota errors to make them more readable
        if (data.details?.includes('quota') || data.details?.includes('RESOURCE_EXHAUSTED')) {
          setError('AI Quota Exceeded. Please wait a minute and try again.');
        } else {
          setError(data.error + (data.details ? `: ${data.details}` : ''));
        }
        return;
      }

      setFloorPlan(data);
      if (data.rooms) {
        setBudget(calculateBudget(data.rooms));
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#f8fafc]">
      <div className="fixed inset-0 z-10 w-full h-full bg-white">
        <FloorPlanViewer rooms={floorPlan?.rooms || []} onFloorplanClear={handleClearFloorplan} budget={budget ?? undefined} />
      </div>

      <div className="absolute bottom-8 right-1/2 translate-x-1/2 z-10 w-full sm:w-full md:max-w-md">
        <div className=" p-6">
          <div className="flex flex-col gap-3">
            <div className="relative group">
              <InputGroup className="bg-white/70 backdrop-blur-md shadow-lg border border-slate-200/60 rounded-2xl! transition-all duration-300 focus-within:shadow-xl focus-within:bg-white focus-within:-translate-y-0.5">
                <InputGroupTextarea
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !loading) handleGenerate(input);
                    }
                  }}
                  placeholder="Describe your dream layout..."
                  className="focus:ring-0 min-h-[56px] py-4 pl-5 resize-none text-rose-950 placeholder:text-rose-950/75"
                />
                <InputGroupAddon align="inline-end" className="mb-1 mr-1 self-end">
                  <div className="flex gap-1 items-center transition-all duration-300">
                    {!input.trim() ? (
                      <InputGroupButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleSpeechInput}
                        className={cn(
                          "rounded-full transition-all duration-200",
                          isListening
                            ? "text-rose-500 bg-rose-50 animate-pulse"
                            : "text-primary hover:bg-primary/10! hover:text-primary"
                        )}
                      >
                        <MicrophoneIcon className={cn("size-5", isListening && "fill-current")} />
                      </InputGroupButton>
                    ) : (
                      <InputGroupButton
                        variant="default"
                        size="icon-sm"
                        onClick={() => handleGenerate(input)}
                        disabled={loading}
                        className="rounded-full bg-primary text-white shadow-sm transition-all duration-200 active:scale-95"
                      >
                        {loading ? <SquareIcon className="size-3.5 fill-current animate-pulse" /> : <ArrowUpIcon className="size-4" />}
                      </InputGroupButton>
                    )}
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="flex justify-center">
              {
                !!!floorPlan && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-10 text-sm text-primary font-bold hover:text-rose-950 hover:bg-primary/10! px-4 bg-transparent"
                    onClick={handleLoadSample}
                  >
                    Try a sample
                  </Button>
                )
              }
            </div>
          </div>


        </div>
      </div>
      {/* 4. Notes/Description Overlay (Bottom Right) */}
      {!!floorPlan?.notes && (
        <div className="absolute bottom-8 right-8 z-10 max-w-xs text-right hidden lg:block">
          <p className="text-xs text-neutral-950 italic leading-relaxed bg-neutral-600/5 backdrop-blur-sm p-3 rounded-lg border border-white/40">
            &quot;{floorPlan.notes}&quot;
          </p>
        </div>
      )}

      {/* Development Progress Badge */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none sm:pointer-events-auto">
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-black/20 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] animate-in fade-in slide-in-from-top duration-700">
          <div className="relative flex h-2 w-2 transition-all ease-in">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </div>
          <a href='https://github.com/inconquested/rosa-miniporto' className="text-[10px] font-semibold text-rose-900 dark:text-rose-100 uppercase tracking-widest whitespace-nowrap underline">
            Development On Progress
          </a>
        </div>
      </div>


      {/* Error Message */}
      {!!error && (
        <div className="fixed md:absolute z-50 top-4 left-4 right-4 md:top-auto md:bottom-8 md:left-8 md:right-auto md:w-auto md:max-w-md p-4 bg-white/90 backdrop-blur-sm border border-rose-100 rounded-2xl text-rose-600 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top md:slide-in-from-left duration-300">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}