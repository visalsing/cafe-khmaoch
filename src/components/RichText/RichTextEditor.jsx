import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { RICH_CLASS } from "./richStyle";

const MAX_HTML = 12000; // the same limit as the server

function normalizeUrl(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(v)) return v;
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(v)) return `mailto:${v}`;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) return `https://${v}`; // "example.com/menu"
  return "";
}

function Btn({ title, active = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keeps the text selected while you click
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
        active ? "bg-accent-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />;

/**
 * value    the saved HTML      onChange(html)  called on every change ("" when the editor is empty)
 * Use  key={language}  on it, so each language gets its own fresh editor.
 */
export default function RichTextEditor({ value = "", onChange, minHeight = "14rem" }) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const [mode, setMode] = useState("visual"); // "visual" | "html"
  const [source, setSource] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, code: false, codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: `${RICH_CLASS} px-4 py-3 focus:outline-none`, style: `min-height:${minHeight}` },
    },
    onUpdate: ({ editor: ed }) => onChangeRef.current?.(ed.isEmpty ? "" : ed.getHTML()),
  });

  if (!editor) return null;

  const visual = mode === "visual";
  const html = editor.isEmpty ? "" : editor.getHTML();
  const length = visual ? html.length : source.length;
  const tooLong = length > MAX_HTML;

  const toHtml = () => {
    setSource(html);
    setLinkOpen(false);
    setMode("html");
  };
  const toVisual = () => {
    editor.commands.setContent(source || ""); // the editor reads the HTML and drops anything it does not support
    onChangeRef.current?.(editor.isEmpty ? "" : editor.getHTML());
    setMode("visual");
  };

  const openLink = () => {
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkError("");
    setLinkOpen((open) => !open);
  };
  const applyLink = () => {
    const href = normalizeUrl(linkUrl);
    if (!href) return setLinkError("Use a web address (https://...), an email, a phone (tel:...) or a page path (/shop).");
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  };

  const level = [2, 3, 4].find((n) => editor.isActive("heading", { level: n })) || 0;
  const run = (fn) => () => fn(editor.chain().focus()).run();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
        <select
          value={level}
          disabled={!visual}
          onChange={(e) => {
            const n = Number(e.target.value);
            const chain = editor.chain().focus();
            if (n) chain.setHeading({ level: n }).run();
            else chain.setParagraph().run();
          }}
          aria-label="Text style"
          className="mr-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value={0}>Paragraph</option>
          <option value={2}>Heading 1</option>
          <option value={3}>Heading 2</option>
          <option value={4}>Heading 3</option>
        </select>

        <Btn title="Bold" disabled={!visual} active={editor.isActive("bold")} onClick={run((c) => c.toggleBold())}><Bold className="h-4 w-4" /></Btn>
        <Btn title="Italic" disabled={!visual} active={editor.isActive("italic")} onClick={run((c) => c.toggleItalic())}><Italic className="h-4 w-4" /></Btn>
        <Btn title="Underline" disabled={!visual} active={editor.isActive("underline")} onClick={run((c) => c.toggleUnderline())}><UnderlineIcon className="h-4 w-4" /></Btn>
        <Btn title="Strikethrough" disabled={!visual} active={editor.isActive("strike")} onClick={run((c) => c.toggleStrike())}><Strikethrough className="h-4 w-4" /></Btn>
        <Sep />
        <Btn title="Bulleted list" disabled={!visual} active={editor.isActive("bulletList")} onClick={run((c) => c.toggleBulletList())}><List className="h-4 w-4" /></Btn>
        <Btn title="Numbered list" disabled={!visual} active={editor.isActive("orderedList")} onClick={run((c) => c.toggleOrderedList())}><ListOrdered className="h-4 w-4" /></Btn>
        <Btn title="Quote" disabled={!visual} active={editor.isActive("blockquote")} onClick={run((c) => c.toggleBlockquote())}><Quote className="h-4 w-4" /></Btn>
        <Sep />
        <Btn title="Align left" disabled={!visual} active={editor.isActive({ textAlign: "left" })} onClick={run((c) => c.setTextAlign("left"))}><AlignLeft className="h-4 w-4" /></Btn>
        <Btn title="Align center" disabled={!visual} active={editor.isActive({ textAlign: "center" })} onClick={run((c) => c.setTextAlign("center"))}><AlignCenter className="h-4 w-4" /></Btn>
        <Btn title="Align right" disabled={!visual} active={editor.isActive({ textAlign: "right" })} onClick={run((c) => c.setTextAlign("right"))}><AlignRight className="h-4 w-4" /></Btn>
        <Btn title="Justify" disabled={!visual} active={editor.isActive({ textAlign: "justify" })} onClick={run((c) => c.setTextAlign("justify"))}><AlignJustify className="h-4 w-4" /></Btn>
        <Sep />
        <Btn title="Add or edit a link" disabled={!visual} active={editor.isActive("link") || linkOpen} onClick={openLink}><Link2 className="h-4 w-4" /></Btn>
        <Btn title="Remove the link" disabled={!visual || !editor.isActive("link")} onClick={run((c) => c.extendMarkRange("link").unsetLink())}><Unlink className="h-4 w-4" /></Btn>
        <Btn title="Divider line" disabled={!visual} onClick={run((c) => c.setHorizontalRule())}><Minus className="h-4 w-4" /></Btn>
        <Btn title="Clear formatting" disabled={!visual} onClick={run((c) => c.unsetAllMarks().clearNodes())}><Eraser className="h-4 w-4" /></Btn>
        <Sep />
        <Btn title="Undo" disabled={!visual || !editor.can().undo()} onClick={run((c) => c.undo())}><Undo2 className="h-4 w-4" /></Btn>
        <Btn title="Redo" disabled={!visual || !editor.can().redo()} onClick={run((c) => c.redo())}><Redo2 className="h-4 w-4" /></Btn>

        <button
          type="button"
          onClick={visual ? toHtml : toVisual}
          className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
            visual
              ? "border-slate-200 text-slate-600 hover:border-accent-500 dark:border-slate-700 dark:text-slate-300"
              : "border-accent-600 bg-accent-600 text-white"
          }`}
        >
          <Code className="h-3.5 w-3.5" />
          {visual ? "HTML" : "Back to visual"}
        </button>
      </div>

      {/* link box */}
      {linkOpen && visual && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-amber-50/60 px-3 py-2 dark:border-slate-800 dark:bg-amber-950/10">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              setLinkError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://example.com"
            aria-label="Link address"
            className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button type="button" onClick={applyLink} className="rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-700">
            Apply
          </button>
          <button type="button" onClick={() => setLinkOpen(false)} className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
          {linkError && <p role="alert" className="w-full text-xs text-rose-600">{linkError}</p>}
        </div>
      )}

      {/* the writing area */}
      <div className={`max-h-[28rem] overflow-y-auto ${visual ? "" : "hidden"}`}>
        <EditorContent editor={editor} />
      </div>
      {!visual && (
        <textarea
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            onChangeRef.current?.(e.target.value);
          }}
          spellCheck={false}
          aria-label="HTML of the text"
          className="block w-full resize-y bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none"
          style={{ minHeight }}
        />
      )}

      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950/50">
        <span className="text-slate-500">{editor.state.doc.textContent.length.toLocaleString()} characters of text</span>
        <span className={tooLong ? "font-semibold text-rose-600" : "text-slate-400"}>
          {length.toLocaleString()} / {MAX_HTML.toLocaleString()}
        </span>
      </div>
    </div>
  );
}