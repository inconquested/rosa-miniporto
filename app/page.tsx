'use client';
import { useState } from 'react';
import { FloorPlanViewer } from '@/components/floor-plan-viewer';
import { Button } from "@/components/ui/button"
import { calculateBudget } from '@/lib/budget-calculator';
import { FloorPlanData, BudgetData } from '@/types';
import { InputGroup, InputGroupAddon, InputGroupTextarea, InputGroupButton } from '@/components/ui/input-group';
import { MicrophoneIcon, ArrowUpIcon, SquareIcon } from '@phosphor-icons/react';

export default function Home() {
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [input, setInput] = useState('');
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const SAMPLE_DATA: FloorPlanData = {
    "rooms": [
      { "type": "Open Area", "area": 70, "width": 10, "height": 7, "x": 0, "y": 0 },
      { "type": "Kitchen", "area": 25, "width": 5, "height": 5, "x": 10, "y": 0 },
      { "type": "Foyer", "area": 10, "width": 5, "height": 2, "x": 10, "y": 5 },
      { "type": "Hallway", "area": 30, "width": 15, "height": 2, "x": 0, "y": 7 },
      { "type": "Bedroom 1", "area": 15, "width": 5, "height": 3, "x": 0, "y": 9 },
      { "type": "Bedroom 2", "area": 15, "width": 5, "height": 3, "x": 5, "y": 9 },
      { "type": "Bathroom", "area": 15, "width": 5, "height": 3, "x": 10, "y": 9 }
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')
      setInput(transcript);
    }
    recognition.onerror = (event: any) => {
      setError(event.error);
    }
    recognition.onend = () => {
      setLoading(false);
    }
  }

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
      setBudget(calculateBudget(data.rooms));
    } catch (e: any) {
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
                        className="rounded-full text-primary hover:bg-primary/10! hover:text-primary transition-all duration-200"
                      >
                        <MicrophoneIcon className="size-5" />
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
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary hover:text-rose-950 hover:bg-primary/10! px-4"
                    onClick={handleLoadSample}
                  >
                    Try a sample
                  </Button>
                )
              }
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}
        </div>
      </div>
      {/* 4. Notes/Description Overlay (Bottom Right) */}
      {!!floorPlan?.notes && (
        <div className="absolute bottom-8 right-8 z-10 max-w-xs text-right hidden lg:block">
          <p className="text-xs text-neutral-950 italic leading-relaxed bg-neutral-600/5 backdrop-blur-sm p-3 rounded-lg border border-white/40">
            "{floorPlan.notes}"
          </p>
        </div>
      )}
    </div>
  );
}