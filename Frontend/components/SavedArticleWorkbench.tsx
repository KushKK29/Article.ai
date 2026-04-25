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
  viewCount?: number;
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
  const [originalHtml, setOriginalHtml] = useState("");
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [tocHeadings, setTocHeadings] = useState<{ id: string; text: string; level: number }[]>([]);

  const wordCount = useMemo(() => {
    const text = currentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text ? text.split(" ").length : 0;
  }, [currentHtml]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  useEffect(() => {
    if (!article) return;
    setTopic(article.topic || "");
    const html = article.payload?.content || "";
    setCurrentHtml(html);
    setOriginalHtml((prev) => (article.id !== editorRef.current?.getAttribute("data-article-id") ? html : prev));

    if (editorRef.current) {
      editorRef.current.setAttribute("data-article-id", article.id);
    }
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
    // Parse TOC from article HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const nodes = Array.from(doc.querySelectorAll("h1,h2,h3"));
    setTocHeadings(nodes.map((el, i) => ({
      id: `toc-heading-${i}`,
      text: el.textContent?.trim() || `Section ${i + 1}`,
      level: parseInt(el.tagName[1]),
    })));
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
      const vp = editorViewportRef.current;
      const viewportRect = vp?.getBoundingClientRect();
      const scrollTop = vp?.scrollTop ?? 0;
      const scrollLeft = vp?.scrollLeft ?? 0;
      const baseLeft = (viewportRect ? rect.left - viewportRect.left : rect.left) + scrollLeft;
      const baseTop = (viewportRect ? rect.top - viewportRect.top : rect.top) + scrollTop;
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
      const vp = editorViewportRef.current;
      const viewportRect = vp?.getBoundingClientRect();
      const scrollTop = vp?.scrollTop ?? 0;
      const scrollLeft = vp?.scrollLeft ?? 0;
      const baseLeft = (viewportRect ? rect.left - viewportRect.left : rect.left) + scrollLeft;
      const baseTop = (viewportRect ? rect.top - viewportRect.top : rect.top) + scrollTop;
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
      const scrollTop = editorViewportRef.current?.scrollTop ?? 0;
      const scrollLeft = editorViewportRef.current?.scrollLeft ?? 0;
      const baseTop = (viewportRect ? rect.top - viewportRect.top : rect.top) + scrollTop;
      const adjustedLeft = baseLeft + scrollLeft;
      setSelectionBox({
        top: Math.max(0, baseTop - 6),
        left: Math.max(0, adjustedLeft - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
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
      const vp = editorViewportRef.current;
      const viewportRect = vp?.getBoundingClientRect();
      const scrollTop = vp?.scrollTop ?? 0;
      const scrollLeft = vp?.scrollLeft ?? 0;
      const baseLeft = (viewportRect ? rect.left - viewportRect.left : rect.left) + scrollLeft;
      const baseTop = (viewportRect ? rect.top - viewportRect.top : rect.top) + scrollTop;
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

  const jumpToHeading = (index: number) => {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll("h1,h2,h3");
    headings[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sectionClass = focusMode
    ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#f8fafc]"
    : "glass-card flex flex-col overflow-hidden rounded-2xl";

  return (
    <section className={sectionClass} style={focusMode ? {} : { height: "calc(100vh - 100px)" }}>

      {/* ── Top header ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h3 className="text-base font-semibold text-slatebrand">{headerLabel}</h3>
          <p className="text-xs text-slate-500">Edit content, headings, links, colors, and images.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFocusMode((f) => !f)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {focusMode ? "✕ Exit Focus" : "⛶ Focus Mode"}
          </button>
          <button type="button" onClick={handleDelete} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
            Delete
          </button>
        </div>
      </div>

      {/* ── Sticky Toolbar ── */}
      <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Undo / Redo */}
          <button type="button" onClick={() => applyCommand("undo")} className={toolbarIconButtonClass} title="Undo">
            <ToolbarIcon label="Undo"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M7.5 7H3V2.5" /><path d="M3.25 7.25A7 7 0 1 1 5.5 15" /></svg></ToolbarIcon>
          </button>
          <button type="button" onClick={() => applyCommand("redo")} className={toolbarIconButtonClass} title="Redo">
            <ToolbarIcon label="Redo"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12.5 7H17V2.5" /><path d="M16.75 7.25A7 7 0 1 0 14.5 15" /></svg></ToolbarIcon>
          </button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {/* Format block */}
          <select
            defaultValue="p"
            onChange={(e) => { applyCommand("formatBlock", e.target.value); e.currentTarget.value = "p"; }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
          </select>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {/* Bold / Italic / Underline */}
          <button type="button" onClick={() => applyCommand("bold")} className={toolbarIconButtonClass} title="Bold"><ToolbarIcon label="Bold"><span className="text-sm font-bold">B</span></ToolbarIcon></button>
          <button type="button" onClick={() => applyCommand("italic")} className={toolbarIconButtonClass} title="Italic"><ToolbarIcon label="Italic"><span className="text-sm italic">I</span></ToolbarIcon></button>
          <button type="button" onClick={() => applyCommand("underline")} className={toolbarIconButtonClass} title="Underline"><ToolbarIcon label="Underline"><span className="text-sm underline">U</span></ToolbarIcon></button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {/* Lists */}
          <button type="button" onClick={() => applyCommand("insertUnorderedList")} className={toolbarIconButtonClass} title="Bullet list">
            <ToolbarIcon label="Bullet"><svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M5 5.25A1.25 1.25 0 1 1 3.75 4 1.25 1.25 0 0 1 5 5.25Zm0 5.75A1.25 1.25 0 1 1 3.75 9.75 1.25 1.25 0 0 1 5 11Zm0 5.75A1.25 1.25 0 1 1 3.75 15.5 1.25 1.25 0 0 1 5 16.75ZM8 4h8v1.5H8V4Zm0 5.5h8V11H8V9.5Zm0 5.5h8v1.5H8V15Z" /></svg></ToolbarIcon>
          </button>
          <button type="button" onClick={() => applyCommand("insertOrderedList")} className={toolbarIconButtonClass} title="Numbered list">
            <ToolbarIcon label="Numbered"><svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M4 4.25h1.1V3.5h.8V6H4v-.7h1.1v-.35H4V4.25Zm0 5.25h1.1v-.75h.8v2.25H4v-.7h1.1v-.35H4V9.5Zm0 5.25h1.1V14h.8v2.25H4v-.7h1.1v-.35H4v-.5Z" /><path d="M8 4h8v1.5H8V4Zm0 5.5h8V11H8V9.5Zm0 5.5h8v1.5H8V15Z" /></svg></ToolbarIcon>
          </button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {/* Align */}
          <button type="button" onClick={() => applyCommand("justifyLeft")} className={toolbarIconButtonClass} title="Align left"><ToolbarIcon label="Left"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M3 4h14M3 8h10M3 12h14M3 16h8" /></svg></ToolbarIcon></button>
          <button type="button" onClick={() => applyCommand("justifyCenter")} className={toolbarIconButtonClass} title="Center"><ToolbarIcon label="Center"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 4h12M6 8h8M4 12h12M7 16h6" /></svg></ToolbarIcon></button>
          <button type="button" onClick={() => applyCommand("justifyRight")} className={toolbarIconButtonClass} title="Align right"><ToolbarIcon label="Right"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M3 4h14M7 8h10M3 12h14M9 16h8" /></svg></ToolbarIcon></button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {/* Link */}
          <button type="button" onClick={handleInsertLink} className={toolbarIconButtonClass} title="Insert link">
            <ToolbarIcon label="Link"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M8.2 11.8 11.8 8.2" /><path d="M7 13a3 3 0 0 1 0-4.2l1-1a3 3 0 1 1 4.2 4.2l-.5.5" /><path d="M13 7a3 3 0 0 1 0 4.2l-1 1a3 3 0 1 1-4.2-4.2l.5-.5" /></svg></ToolbarIcon>
            Link
          </button>
          <button type="button" onClick={() => applyCommand("removeFormat")} className={toolbarIconButtonClass} title="Clear format">
            <ToolbarIcon label="Clear"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M5 5h10M8 5l-2 10M11 5 9 15" /><path d="m4 16 12-12" /></svg></ToolbarIcon>
            Clear
          </button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {/* Color + Size */}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700" title="Text color">
            Color
            <input type="color" value={fontColor} onChange={(e) => { setFontColor(e.target.value); document.execCommand("styleWithCSS", false, "true"); applyCommand("foreColor", e.target.value); }} className="h-6 w-7 rounded border-0 bg-transparent p-0" />
          </label>
          <select value={fontSize} onChange={(e) => { setFontSize(e.target.value); wrapSelectionWithStyle({ fontSize: `${e.target.value}px` }); }} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
            {["14", "16", "18", "20", "24", "28"].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {/* Upload image */}
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            Upload Image
            <input type="file" accept="image/*" onChange={handleInsertImage} className="hidden" />
          </label>
          <button type="button" onClick={() => { selectedImage?.remove(); syncEditorState(); }} className={toolbarIconButtonClass} title="Remove selected image">
            Remove Image
          </button>
        </div>
      </div>

      {/* ── Topic input ── */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Topic</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>

      {/* ── Main body: TOC + Editor + Meta ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* TOC sidebar */}
        {tocHeadings.length > 0 && (
          <aside className="hidden w-48 shrink-0 overflow-y-auto border-r border-slate-100 bg-slate-50 p-3 xl:flex xl:flex-col">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Contents</p>
            <nav className="space-y-0.5">
              {tocHeadings.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => jumpToHeading(i)}
                  className={`block w-full rounded px-2 py-1 text-left text-xs transition hover:bg-slate-200 ${h.level === 1 ? "font-bold text-slate-800" : h.level === 2 ? "pl-3 font-semibold text-slate-700" : "pl-5 text-slate-500"}`}
                >
                  {h.text.length > 36 ? h.text.slice(0, 36) + "…" : h.text}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Editable content area */}
        <div ref={editorViewportRef} className="relative min-w-0 flex-1 overflow-y-auto">
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
            className="article-html min-h-full p-6 outline-none"
            style={{ cursor: "text" }}
          />
          {selectedImage && selectionBox ? (
            <div
              className="pointer-events-none absolute z-30 border-2 border-sky-500 bg-sky-500/5"
              style={{ top: selectionBox.top, left: selectionBox.left, width: selectionBox.width, height: selectionBox.height }}
            >
              <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full border-2 border-sky-500 bg-white" />
              <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full border-2 border-sky-500 bg-white" />
              <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-sky-500 bg-white" />
              <button
                type="button"
                onPointerDown={startImageResize}
                className="pointer-events-auto absolute -bottom-3 -right-3 h-7 w-7 cursor-se-resize rounded-full border-2 border-sky-600 bg-sky-500 shadow-lg"
                aria-label="Resize image"
              >
                <span className="absolute left-1 top-1 h-2 w-2 rounded-full border border-white/90" />
              </button>
            </div>
          ) : null}
          {/* Image inspector modal — disabled
          {selectedImage && imageInspectorPosition ? (
            <div className="absolute z-40 w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl" style={{ top: imageInspectorPosition.top, left: imageInspectorPosition.left }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-slatebrand">Image Inspector</p>
                <button type="button" onClick={() => { setSelectedImage(null); setImageInspectorPosition(null); }} className="rounded border px-2 py-1 text-xs font-semibold">Close</button>
              </div>
              <div className="mt-3 space-y-3 text-xs">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img src={selectedImage.src} alt={selectedImage.alt || ""} className="h-28 w-full object-cover" />
                </div>
                <p className="break-all text-slate-600"><span className="font-semibold">Alt:</span> {selectedImage.alt || "No alt text"}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateSelectedImage({ display: "block", margin: "12px auto", borderRadius: "12px" })} className="flex-1 rounded-lg border px-3 py-2 font-semibold text-slate-700">Center</button>
                  <button type="button" onClick={() => { selectedImage.remove(); setSelectedImage(null); setImageInspectorPosition(null); syncEditorState(); }} className="flex-1 rounded-lg border border-rose-300 px-3 py-2 font-semibold text-rose-700">Remove</button>
                </div>
              </div>
            </div>
          ) : null}
          */}
        </div>

        {/* Live Meta sidebar — hidden in focus mode */}
        {!focusMode && (
          <aside className="hidden w-48 shrink-0 overflow-y-auto border-l border-slate-100 bg-slate-50 p-4 xl:flex xl:flex-col">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Meta</h4>
            <div className="space-y-2 text-xs text-slate-600">
              <p><span className="font-semibold">Status:</span> {article.status || "draft"}</p>
              <p><span className="font-semibold">Slug:</span> {article.slug || "Not published"}</p>
              <p><span className="font-semibold">Views:</span> {(article.viewCount ?? 0).toLocaleString()}</p>
              <p><span className="font-semibold">Published:</span> {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "No"}</p>
            </div>
          </aside>
        )}
      </div>

      {/* ── Sticky Bottom Action Bar ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span><span className="font-semibold text-slate-800">{wordCount.toLocaleString()}</span> words</span>
          <span><span className="font-semibold text-slate-800">{readingTime} min</span> read</span>
          {saving && <span className="text-slate-400">Saving…</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (currentHtml !== originalHtml) {
                setShowDiffModal(true);
              } else {
                await handleSave();
                onPublish(article.id);
              }
            }}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            Publish
          </button>
        </div>
      </div>

      {/* ── Diff Modal ── */}
      {showDiffModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Publish Draft: Confirm Changes</h3>
                <p className="text-sm text-slate-500">Review your edits against the previous version before making them live.</p>
              </div>
              <button type="button" onClick={() => setShowDiffModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/2 overflow-y-auto border-r border-slate-200 bg-slate-50 p-6">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Previous Version</h4>
                <div className="article-html opacity-75" dangerouslySetInnerHTML={{ __html: originalHtml }} />
              </div>
              <div className="w-1/2 overflow-y-auto bg-white p-6">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-600">Current Draft</h4>
                <div className="article-html" dangerouslySetInnerHTML={{ __html: currentHtml }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5">
              <button type="button" onClick={() => setShowDiffModal(false)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDiffModal(false);
                  await handleSave();
                  onPublish(article.id);
                  setOriginalHtml(currentHtml);
                }}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Confirm &amp; Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
