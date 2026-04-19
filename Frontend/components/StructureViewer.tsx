"use client";

import { ArticleStructure } from "@/lib/types";

type StructureViewerProps = {
  structure: ArticleStructure | null;
};

export default function StructureViewer({ structure }: StructureViewerProps) {
  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <h2 className="mb-4 text-xl font-semibold text-slatebrand">Article Structure</h2>

      {!structure ? (
        <p className="text-sm text-slate-500">No structure yet. Generate content to inspect heading hierarchy.</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white">H1: {structure.h1}</div>
          {structure.sections.map((section) => (
            <details
              key={section.h2}
              className="rounded-lg border border-slate-200 bg-white p-3"
              open
            >
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">H2: {section.h2}</summary>
              <div className="mt-3 space-y-2 pl-4">
                {section.subsections.map((subsection) => (
                  <div key={subsection.h3} className="rounded-md bg-slate-50 p-2">
                    <p className="text-sm font-medium text-slate-700">H3: {subsection.h3}</p>
                    {subsection.h4_tags.length > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {subsection.h4_tags.map((h4) => (
                          <li key={h4}>H4: {h4}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
