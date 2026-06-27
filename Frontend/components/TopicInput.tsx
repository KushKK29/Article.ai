"use client";

type TopicInputProps = {
  topic: string;
  setTopic: (value: string) => void;
  onGenerate: () => Promise<void>;
  loading: boolean;
  currentStep: number;
  steps: string[];

  // New scheduling props
  isScheduled: boolean;
  setIsScheduled: (val: boolean) => void;
  scheduledAt: string;
  setScheduledAt: (val: string) => void;
  autoPublish: boolean;
  setAutoPublish: (val: boolean) => void;
  onSchedule: () => Promise<void>;
};

export default function TopicInput({
  topic,
  setTopic,
  onGenerate,
  loading,
  currentStep,
  steps,
  isScheduled,
  setIsScheduled,
  scheduledAt,
  setScheduledAt,
  autoPublish,
  setAutoPublish,
  onSchedule
}: TopicInputProps) {
  return (
    <section className="bg-white border-2 border-[#0B132B] rounded-2xl p-6 shadow-[3px_3px_0px_rgba(11,19,43,0.05)]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 border-b border-[#0B132B]/10 pb-4">
          <h2 className="font-serif text-xl font-extrabold text-[#0B132B]">Manuscript Composition</h2>
          <span className="bg-[#FEF08A] text-[#0B132B] border border-[#0B132B] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
            Engine v1.0
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono uppercase tracking-wider text-[#4B5563]">
            Manuscript Topic / Search Query
          </label>
          <textarea
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            rows={3}
            placeholder="Enter a precise editorial focus, e.g. Best AI Study Tools for Engineering Students in 2026"
            className="w-full rounded-none border-2 border-[#0B132B] bg-white px-4 py-3 text-sm text-[#0B132B] outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:ring-offset-1 font-sans transition-shadow"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#4B5563]">Presets:</span>
          {["Tutorial", "Review", "Comparison", "Case Study"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setTopic(topic ? `${preset}: ${topic.replace(/^(Tutorial|Review|Comparison|Case Study):\s*/i, '')}` : `${preset}: `)}
              className="rounded-none border-2 border-[#0B132B] bg-white px-3 py-1 text-xs font-mono font-bold text-[#0B132B] transition hover:bg-[#F4F6F9] hover:shadow-[2px_2px_0px_rgba(11,19,43,1)] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Schedule Toggle */}
        <div className="flex flex-col gap-4 border-t border-[#0B132B]/10 pt-4">
          <div className="flex items-center gap-3">
            <input
              id="schedule-toggle"
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="h-4 w-4 rounded-none border-2 border-[#0B132B] text-[#1D4ED8] focus:ring-[#1D4ED8]"
            />
            <label htmlFor="schedule-toggle" className="text-xs font-mono uppercase tracking-wider text-[#0B132B] cursor-pointer select-none font-bold">
              📅 Schedule Staggered Composition
            </label>
          </div>

          {isScheduled && (
            <div className="flex flex-col gap-3 pl-7">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[#4B5563]">Composition Run Time (Local)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="rounded-none border-2 border-[#0B132B] bg-white px-3 py-2 text-sm text-[#0B132B] outline-none focus:border-[#1D4ED8] font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="auto-publish-toggle"
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="h-4 w-4 rounded-none border-2 border-[#0B132B] text-[#1D4ED8] focus:ring-[#1D4ED8]"
                />
                <label htmlFor="auto-publish-toggle" className="text-xs font-mono uppercase tracking-wider text-[#4B5563] cursor-pointer select-none">
                  🚀 Auto-publish once typesetting completes
                </label>
              </div>
            </div>
          )}
        </div>

        {isScheduled ? (
          <button
            type="button"
            onClick={onSchedule}
            disabled={loading || !topic.trim() || !scheduledAt}
            className="w-full text-center rounded-none bg-[#0B132B] text-white py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Scheduling..." : "Schedule Article"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading || !topic.trim()}
            className="w-full text-center rounded-none bg-[#0B132B] text-white py-3 text-xs font-mono font-bold uppercase tracking-wider shadow-[3px_3px_0px_rgba(29,78,216,1)] hover:shadow-none transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Generate Galley Proof"}
          </button>
        )}

        <div className="rounded-none border-2 border-[#0B132B] bg-[#F4F6F9] p-4">
          <p className="mb-3 text-xs font-mono uppercase tracking-wider text-[#4B5563] font-bold">Typesetting Progress</p>
          <ol className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            {steps.map((step, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep && loading;
              return (
                <li
                  key={step}
                  className={`rounded-none border-2 px-3 py-2 font-mono text-center transition-all ${isDone
                      ? "border-[#0B132B] bg-white text-[#0B132B] shadow-[2px_2px_0px_rgba(11,19,43,1)]"
                      : isActive
                        ? "border-[#1D4ED8] bg-[#FEF08A] text-[#0B132B] font-bold animate-pulse"
                        : "border-[#0B132B]/10 bg-white/50 text-[#4B5563] opacity-60"
                    }`}
                >
                  {step}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
