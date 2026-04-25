"use client";

type TopicInputProps = {
  topic: string;
  setTopic: (value: string) => void;
  onGenerate: () => Promise<void>;
  loading: boolean;
  currentStep: number;
  steps: string[];
};

export default function TopicInput({
  topic,
  setTopic,
  onGenerate,
  loading,
  currentStep,
  steps
}: TopicInputProps) {
  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slatebrand">Topic Input</h2>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            ArticleShip Generator
          </span>
        </div>

        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          rows={3}
          placeholder="Enter a precise topic, ex: Best AI Study Tools for Engineering Students in 2026"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-brand transition focus:ring"
        />

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || !topic.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-slatebrand px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">Pipeline Progress</p>
          <ol className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            {steps.map((step, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep && loading;
              return (
                <li
                  key={step}
                  className={`rounded-lg border px-3 py-2 ${isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : isActive
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-500"
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
