"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type SavedArticlePayload = {
  meta?: Record<string, unknown> | null;
  keywords?: Record<string, unknown> | null;
  structure?: Record<string, unknown> | null;
  content?: string;
  blocks?: unknown[];
  images?: Array<{
    url?: string;
    alt?: string;
    caption?: string;
  }>;
};

export type SavedArticleRecord = {
  id: string;
  topic: string;
  createdAt: string;
  status?: "draft" | "published";
  slug?: string | null;
  publishedAt?: string | null;
  payload: SavedArticlePayload;
};

type WorkbenchProps = {
  article: SavedArticleRecord | null;
  onSave: (articleId: string, nextTopic: string, nextPayload: SavedArticlePayload) => Promise<void>;
  onPublish: (articleId: string) => Promise<void>;
  onDelete: (articleId: string) => Promise<void>;
};

function sanitizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractImagesFromHtml(html: string) {
  if (typeof window === "undefined") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return Array.from(doc.querySelectorAll("img")).map((image) => {
    const figcaption = image.closest("figure")?.querySelector("figcaption")?.textContent?.trim() || "";
    return {
      url: image.getAttribute("src") || "",
      alt: image.getAttribute("alt") || "",
      caption: figcaption,
    };
  });
}

function applyCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function ToolbarIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true" title={label}>
      {children}
    </span>
  );
}

export default function SavedArticleWorkbench({ article, onSave, onPublish, onDelete }: WorkbenchProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorViewportRef = useRef<HTMLDivElement | null>(null);
  const [topic, setTopic] = useState("");
  const [currentHtml, setCurrentHtml] = useState("");
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageInspectorPosition, setImageInspectorPosition] = useState<{ top: number; left: number } | null>(null);
  const [fontColor, setFontColor] = useState("#0f172a");
  const [fontSize, setFontSize] = useState("16");
  const [imageWidth, setImageWidth] = useState(72);
  const [selectionBox, setSelectionBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [resizingImage, setResizingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!article) return;
    setTopic(article.topic || "");
    const html = article.payload?.content || "";
    setCurrentHtml(html);
    setSelectedImage(null);
    setImageInspectorPosition(null);
    setSelectionBox(null);
    setResizingImage(false);
    setFontColor("#0f172a");
    setFontSize("16");
    setImageWidth(72);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  }, [article]);

  const headerLabel = useMemo(() => {
    if (!article) return "Select an article to edit";
    return article.status === "published" ? "Published article editor" : "Draft article editor";
  }, [article]);

  const syncEditorState = () => {
    const html = editorRef.current?.innerHTML || "";
    setCurrentHtml(html);
  };

  const getInspectorPositionFromRect = (rect: DOMRect, viewportRect?: DOMRect) => {
    const inspectorWidth = 300;
    const inspectorHeightEstimate = 320;
    const gap = 10;
    const viewportWidth = viewportRect?.width || window.innerWidth;
    const viewportHeight = viewportRect?.height || window.innerHeight;

    const imageLeft = viewportRect ? rect.left - viewportRect.left : rect.left;
    const imageRight = viewportRect ? rect.right - viewportRect.left : rect.right;
    const imageTop = viewportRect ? rect.top - viewportRect.top : rect.top;
    const imageBottom = viewportRect ? rect.bottom - viewportRect.top : rect.bottom;

    const preferredRight = imageRight + gap;
    const preferredLeft = imageLeft - inspectorWidth - gap;
    const maxLeft = Math.max(12, viewportWidth - inspectorWidth - 12);

    const canPlaceRight = preferredRight + inspectorWidth <= viewportWidth - 12;
    const canPlaceLeft = preferredLeft >= 12;

    let left = preferredRight;
    let top = imageTop;

    if (canPlaceRight) {
      left = preferredRight;
    } else if (canPlaceLeft) {
      left = preferredLeft;
    } else {
      // If side placement is not possible, keep inspector near image by docking below it.
      left = imageLeft + rect.width / 2 - inspectorWidth / 2;
      top = imageBottom + gap;
    }

    left = Math.min(maxLeft, Math.max(12, left));
    top = Math.max(12, Math.min(top, viewportHeight - inspectorHeightEstimate - 12));

    return { top, left };
  };

  const wrapSelectionWithStyle = (style: Partial<CSSStyleDeclaration>) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const wrapper = document.createElement("span");
    Object.assign(wrapper.style, style);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selection.removeAllRanges();
    syncEditorState();
  };

  const updateSelectedImage = (nextStyles: Partial<CSSStyleDeclaration>) => {
    if (!selectedImage) return;
    Object.assign(selectedImage.style, nextStyles);
    setImageWidth(Number.parseInt(selectedImage.style.width || `${imageWidth}%`, 10) || imageWidth);
    syncEditorState();
    requestAnimationFrame(() => {
      const rect = selectedImage.getBoundingClientRect();
      const viewportRect = editorViewportRef.current?.getBoundingClientRect();
      const baseLeft = viewportRect ? rect.left - viewportRect.left : rect.left;
      const baseTop = viewportRect ? rect.top - viewportRect.top : rect.top;
      setImageInspectorPosition(getInspectorPositionFromRect(rect, viewportRect));
      setSelectionBox({
        top: Math.max(0, baseTop - 6),
        left: Math.max(0, baseLeft - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    });
  };

  const focusImageInspector = (image: HTMLImageElement) => {
    setSelectedImage(image);
    const widthValue = Number.parseInt(image.style.width || "72", 10);
    if (!Number.isNaN(widthValue)) setImageWidth(widthValue);
    requestAnimationFrame(() => {
      const rect = image.getBoundingClientRect();
      const viewportRect = editorViewportRef.current?.getBoundingClientRect();
      const baseLeft = viewportRect ? rect.left - viewportRect.left : rect.left;
      const baseTop = viewportRect ? rect.top - viewportRect.top : rect.top;
      setImageInspectorPosition(getInspectorPositionFromRect(rect, viewportRect));
      setSelectionBox({
        top: Math.max(0, baseTop - 6),
        left: Math.max(0, baseLeft - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    });
  };

  const startImageResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!selectedImage) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = selectedImage.getBoundingClientRect().width;
    const viewportRect = editorViewportRef.current?.getBoundingClientRect();
    const move = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(120, Math.min(760, Math.round(startWidth + delta)));
      selectedImage.style.width = `${nextWidth}px`;
      selectedImage.style.maxWidth = "none";
      selectedImage.style.display = "block";
      selectedImage.style.margin = "12px auto";
      selectedImage.style.borderRadius = "12px";
      setImageWidth(nextWidth);
      syncEditorState();

      const rect = selectedImage.getBoundingClientRect();
      const baseLeft = viewportRect ? rect.left - viewportRect.left : rect.left;
      const baseTop = viewportRect ? rect.top - viewportRect.top : rect.top;
      setSelectionBox({
        top: Math.max(0, baseTop - 6),
        left: Math.max(0, baseLeft - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
      setImageInspectorPosition(getInspectorPositionFromRect(rect, viewportRect));
    };

    const up = () => {
      setResizingImage(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    setResizingImage(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handleInsertLink = () => {
    const url = window.prompt("Enter link URL");
    if (!url) return;
    applyCommand("createLink", url);
    syncEditorState();
  };

  const handleInsertImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editorRef.current) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = document.createElement("img");
      image.src = String(reader.result || "");
      image.alt = file.name;
      image.style.width = "72%";
      image.style.maxWidth = "760px";
      image.style.display = "block";
      image.style.margin = "12px auto";
      image.style.borderRadius = "12px";

      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (range) {
        range.deleteContents();
        range.insertNode(image);
      } else {
        editorRef.current?.appendChild(image);
      }
      syncEditorState();
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSave = async () => {
    if (!article) return;
    setSaving(true);
    try {
      await onSave(article.id, sanitizeText(topic) || article.topic, {
        ...article.payload,
        content: currentHtml,
        images: extractImagesFromHtml(currentHtml),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    const confirmed = window.confirm(`Delete \"${article.topic}\" permanently? This cannot be undone.`);
    if (!confirmed) return;

    await onDelete(article.id);
  };

  const toolbarButtonClass = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100";
  const toolbarIconButtonClass = "inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100";
  const toolbarGroupClass = "flex flex-wrap items-center gap-2";

  useLayoutEffect(() => {
    if (!selectedImage) return;

    const syncPosition = () => {
      const rect = selectedImage.getBoundingClientRect();
      const viewportRect = editorViewportRef.current?.getBoundingClientRect();
      const baseLeft = viewportRect ? rect.left - viewportRect.left : rect.left;
      const baseTop = viewportRect ? rect.top - viewportRect.top : rect.top;
      setImageInspectorPosition(getInspectorPositionFromRect(rect, viewportRect));
      setSelectionBox({
        top: Math.max(0, baseTop - 6),
        left: Math.max(0, baseLeft - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    };

    syncPosition();
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);
    editorViewportRef.current?.addEventListener("scroll", syncPosition);
    return () => {
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
      editorViewportRef.current?.removeEventListener("scroll", syncPosition);
    };
  }, [selectedImage]);

  if (!article) {
    return (
      <section className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-slatebrand">{headerLabel}</h3>
        <p className="mt-2 text-sm text-slate-500">Pick a saved article from the list to start editing.</p>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slatebrand">{headerLabel}</h3>
            <p className="text-sm text-slate-500">Edit content, headings, links, colors, fonts, and images directly.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleDelete} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700">
              Delete
            </button>
            <button type="button" onClick={() => onPublish(article.id)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              Publish
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Text Formatting</p>
              <p className="mt-1 text-[11px] text-slate-400">Select text first, then apply a style.</p>
            </div>
            <p className="text-[11px] text-slate-400">Formatting updates the live editor content.</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm">
              <button type="button" onClick={() => applyCommand("undo")} className={toolbarIconButtonClass} aria-label="Undo">
                <ToolbarIcon label="Undo">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M7.5 7H3V2.5" />
                    <path d="M3.25 7.25A7 7 0 1 1 5.5 15" />
                  </svg>
                </ToolbarIcon>
                Undo
              </button>
              <button type="button" onClick={() => applyCommand("redo")} className={toolbarIconButtonClass} aria-label="Redo">
                <ToolbarIcon label="Redo">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M12.5 7H17V2.5" />
                    <path d="M16.75 7.25A7 7 0 1 0 14.5 15" />
                  </svg>
                </ToolbarIcon>
                Redo
              </button>
              <button type="button" onClick={() => document.execCommand("copy")} className={toolbarIconButtonClass} aria-label="Copy">
                <ToolbarIcon label="Copy">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <rect x="7" y="7" width="8" height="8" rx="1.5" />
                    <rect x="4" y="4" width="8" height="8" rx="1.5" />
                  </svg>
                </ToolbarIcon>
                Copy
              </button>
              <button type="button" onClick={() => document.execCommand("paste")} className={toolbarIconButtonClass} aria-label="Paste">
                <ToolbarIcon label="Paste">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M7 3.5h6a1 1 0 0 1 1 1V6h-8V4.5a1 1 0 0 1 1-1Z" />
                    <rect x="5" y="6" width="10" height="10" rx="1.5" />
                  </svg>
                </ToolbarIcon>
                Paste
              </button>
              <select
                value="p"
                onChange={(event) => {
                  applyCommand("formatBlock", event.target.value);
                  event.currentTarget.value = "p";
                }}
                className="min-w-[130px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                aria-label="Block format"
              >
                <option value="p">Paragraph</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm">
              <div className={toolbarGroupClass}>
                <button type="button" onClick={() => applyCommand("bold")} className={toolbarIconButtonClass} aria-label="Bold">
                  <ToolbarIcon label="Bold">
                    <span className="text-sm font-bold">B</span>
                  </ToolbarIcon>
                  Bold
                </button>
                <button type="button" onClick={() => applyCommand("italic")} className={toolbarIconButtonClass} aria-label="Italic">
                  <ToolbarIcon label="Italic">
                    <span className="text-sm italic font-semibold">I</span>
                  </ToolbarIcon>
                  Italic
                </button>
                <button type="button" onClick={() => applyCommand("underline")} className={toolbarIconButtonClass} aria-label="Underline">
                  <ToolbarIcon label="Underline">
                    <span className="text-sm font-semibold underline">U</span>
                  </ToolbarIcon>
                  Underline
                </button>
              </div>

              <div className={toolbarGroupClass}>
                <button type="button" onClick={() => applyCommand("insertUnorderedList")} className={toolbarIconButtonClass} aria-label="Bullet list">
                  <ToolbarIcon label="Bullet list">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M5 5.25A1.25 1.25 0 1 1 3.75 4 1.25 1.25 0 0 1 5 5.25Zm0 5.75A1.25 1.25 0 1 1 3.75 9.75 1.25 1.25 0 0 1 5 11Zm0 5.75A1.25 1.25 0 1 1 3.75 15.5 1.25 1.25 0 0 1 5 16.75ZM8 4h8v1.5H8V4Zm0 5.5h8V11H8V9.5Zm0 5.5h8v1.5H8V15Z" />
                    </svg>
                  </ToolbarIcon>
                  Bullet
                </button>
                <button type="button" onClick={() => applyCommand("insertOrderedList")} className={toolbarIconButtonClass} aria-label="Numbered list">
                  <ToolbarIcon label="Numbered list">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M4 4.25h1.1V3.5h.8V6H4v-.7h1.1v-.35H4V4.25Zm0 5.25h1.1v-.75h.8v2.25H4v-.7h1.1v-.35H4V9.5Zm0 5.25h1.1V14h.8v2.25H4v-.7h1.1v-.35H4v-.5Z" />
                      <path d="M8 4h8v1.5H8V4Zm0 5.5h8V11H8V9.5Zm0 5.5h8v1.5H8V15Z" />
                    </svg>
                  </ToolbarIcon>
                  Numbered
                </button>
                <button type="button" onClick={() => applyCommand("outdent")} className={toolbarIconButtonClass} aria-label="Decrease indent">
                  <ToolbarIcon label="Decrease indent">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M8 5h8M8 10h8M8 15h8" />
                      <path d="M5 7.5 2.5 10 5 12.5" />
                    </svg>
                  </ToolbarIcon>
                  Outdent
                </button>
                <button type="button" onClick={() => applyCommand("indent")} className={toolbarIconButtonClass} aria-label="Increase indent">
                  <ToolbarIcon label="Increase indent">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M8 5h8M8 10h8M8 15h8" />
                      <path d="m5 7.5 2.5 2.5L5 12.5" />
                    </svg>
                  </ToolbarIcon>
                  Indent
                </button>
              </div>

              <div className={toolbarGroupClass}>
                <button type="button" onClick={() => applyCommand("justifyLeft")} className={toolbarIconButtonClass} aria-label="Align left">
                  <ToolbarIcon label="Align left">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M3 4h14M3 8h10M3 12h14M3 16h8" />
                    </svg>
                  </ToolbarIcon>
                </button>
                <button type="button" onClick={() => applyCommand("justifyCenter")} className={toolbarIconButtonClass} aria-label="Align center">
                  <ToolbarIcon label="Align center">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M4 4h12M6 8h8M4 12h12M7 16h6" />
                    </svg>
                  </ToolbarIcon>
                </button>
                <button type="button" onClick={() => applyCommand("justifyRight")} className={toolbarIconButtonClass} aria-label="Align right">
                  <ToolbarIcon label="Align right">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M3 4h14M7 8h10M3 12h14M9 16h8" />
                    </svg>
                  </ToolbarIcon>
                </button>
                <button type="button" onClick={() => applyCommand("justifyFull")} className={toolbarIconButtonClass} aria-label="Justify">
                  <ToolbarIcon label="Justify">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M3 4h14M3 8h14M3 12h14M3 16h14" />
                    </svg>
                  </ToolbarIcon>
                </button>
              </div>

              <div className={toolbarGroupClass}>
                <button type="button" onClick={handleInsertLink} className={toolbarIconButtonClass} aria-label="Insert link">
                  <ToolbarIcon label="Insert link">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M8.2 11.8 11.8 8.2" />
                      <path d="M7 13a3 3 0 0 1 0-4.2l1-1a3 3 0 1 1 4.2 4.2l-.5.5" />
                      <path d="M13 7a3 3 0 0 1 0 4.2l-1 1a3 3 0 1 1-4.2-4.2l.5-.5" />
                    </svg>
                  </ToolbarIcon>
                  Link
                </button>
                <button type="button" onClick={() => applyCommand("unlink")} className={toolbarIconButtonClass} aria-label="Remove link">
                  <ToolbarIcon label="Remove link">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="m4 4 12 12" />
                      <path d="M8.2 11.8 11.8 8.2" />
                      <path d="M7 13a3 3 0 0 1 0-4.2l1-1a3 3 0 0 1 3.9-.3" />
                    </svg>
                  </ToolbarIcon>
                  Unlink
                </button>
                <button type="button" onClick={() => applyCommand("removeFormat")} className={toolbarIconButtonClass} aria-label="Clear formatting">
                  <ToolbarIcon label="Clear formatting">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path d="M5 5h10M8 5l-2 10M11 5 9 15" />
                      <path d="m4 16 12-12" />
                    </svg>
                  </ToolbarIcon>
                  Clear
                </button>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                Color
                <input
                  type="color"
                  value={fontColor}
                  onChange={(event) => {
                    setFontColor(event.target.value);
                    document.execCommand("styleWithCSS", false, "true");
                    applyCommand("foreColor", event.target.value);
                  }}
                  className="h-8 w-9 rounded border border-slate-300 bg-white p-1"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                Size
                <select
                  value={fontSize}
                  onChange={(event) => {
                    setFontSize(event.target.value);
                    wrapSelectionWithStyle({ fontSize: `${event.target.value}px` });
                  }}
                  className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="14">14</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="20">20</option>
                  <option value="24">24</option>
                  <option value="28">28</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <label className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700">
            Upload Image
            <input type="file" accept="image/*" onChange={handleInsertImage} className="hidden" />
          </label>
          <button type="button" onClick={() => selectedImage && selectedImage.remove()} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700">Remove Selected Image</button>
          <span className="text-[11px] text-slate-400">Click an image to select it. Use the blue handle on the image to resize directly.</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Topic</label>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />

            <div ref={editorViewportRef} className="relative rounded-2xl border border-slate-200 bg-white p-4">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorState}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.tagName === "IMG") {
                    focusImageInspector(target as HTMLImageElement);
                  } else {
                    setSelectedImage(null);
                    setImageInspectorPosition(null);
                  }
                }}
                className="article-html min-h-[520px] max-h-[72vh] overflow-y-auto rounded-xl pr-1 outline-none"
                style={{ cursor: "text" }}
              />
              {selectedImage && selectionBox ? (
                <div
                  className="pointer-events-none absolute z-30 border-2 border-sky-500 bg-sky-500/5 shadow-[0_0_0_9999px_rgba(255,255,255,0.08)]"
                  style={{
                    top: selectionBox.top,
                    left: selectionBox.left,
                    width: selectionBox.width,
                    height: selectionBox.height,
                  }}
                >
                  <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full border-2 border-sky-500 bg-white" />
                  <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full border-2 border-sky-500 bg-white" />
                  <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-sky-500 bg-white" />
                  <button
                    type="button"
                    onPointerDown={startImageResize}
                    className="pointer-events-auto absolute -bottom-3 -right-3 h-7 w-7 cursor-se-resize rounded-full border-2 border-sky-600 bg-sky-500 shadow-lg"
                    aria-label="Resize image"
                    title="Drag to resize"
                  >
                    <span className="absolute left-1 top-1 h-2 w-2 rounded-full border border-white/90" />
                  </button>
                </div>
              ) : null}

              {selectedImage && imageInspectorPosition ? (
                <div
                  className="absolute z-40 w-[300px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
                  style={{ top: imageInspectorPosition.top, left: imageInspectorPosition.left }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Image Inspector</p>
                      <p className="text-sm font-semibold text-slatebrand">Selected image</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImageInspectorPosition(null);
                      }}
                      className="rounded-md border px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-3 space-y-3 text-xs text-slate-600">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img src={selectedImage.src} alt={selectedImage.alt || "Selected image"} className="h-32 w-full object-cover" />
                    </div>
                    <p className="break-all"><span className="font-semibold">Alt:</span> {selectedImage.alt || "No alt text"}</p>
                    <p className="text-[11px] text-slate-500">Drag the blue handle on the image to resize it directly.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateSelectedImage({ display: "block", margin: "12px auto", borderRadius: "12px" })}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700"
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          selectedImage.remove();
                          setSelectedImage(null);
                          setImageInspectorPosition(null);
                          syncEditorState();
                        }}
                        className="flex-1 rounded-lg border border-rose-300 px-3 py-2 font-semibold text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slatebrand">Live Meta</h4>
            <div className="space-y-2 text-xs text-slate-600">
              <p><span className="font-semibold">Status:</span> {article.status || "draft"}</p>
              <p><span className="font-semibold">Slug:</span> {article.slug || "Not published"}</p>
              <p><span className="font-semibold">Published:</span> {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : "No"}</p>
            </div>
            <p className="text-[11px] text-slate-500">The editor saves the full HTML preview, so heading changes, links, colors, text size, uploaded images, and removals persist in MongoDB when you click Save Changes.</p>
          </aside>
        </div>

      </div>
    </section>
  );
}
