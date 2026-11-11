"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Code2, ImagePlus, Italic, List, ListOrdered } from "lucide-react";

import { Button } from "@/components/ui/button";

const ALLOWED_TAGS = new Set(["p", "div", "br", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote", "pre", "code"]);

export function sanitizeRichText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?([a-z][\w:-]*)\b([^>]*)>/gi, (tag, rawName: string, attrs: string) => {
      const name = rawName.toLowerCase();
      if (name === "img") {
        const src = attrs.match(/\bsrc\s*=\s*(["'])(data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+)\1/i)?.[2];
        return src ? `<img src="${src}" alt="Attached image" class="my-3 max-h-96 max-w-full rounded-lg object-contain" />` : "";
      }
      if (!ALLOWED_TAGS.has(name)) return "";
      const outputName = name === "div" ? "p" : name;
      return tag.startsWith("</") ? `</${outputName}>` : `<${outputName}>`;
    });
}

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && sanitizeRichText(editor.innerHTML) !== sanitizeRichText(value)) editor.innerHTML = sanitizeRichText(value);
  }, [value]);

  function runCommand(command: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList") {
    editorRef.current?.focus();
    document.execCommand(command);
    if (editorRef.current) onChange(sanitizeRichText(editorRef.current.innerHTML));
  }

  function insertCodeBlock() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const selected = selection?.toString() ?? "";
    const code = selected.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    document.execCommand("insertHTML", false, `<pre><code>${code || "Write or paste code here..."}</code></pre><p><br></p>`);
    onChange(sanitizeRichText(editor.innerHTML));
  }

  async function attachImage(file?: File) {
    if (!file) return;
    setImageError("");
    if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
      setImageError("Choose a PNG, JPEG, GIF, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setImageError("Images must be 1 MB or smaller.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image."));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!dataUrl) {
      setImageError("Failed to read image.");
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand("insertHTML", false, `<img src="${dataUrl}" alt="Attached image" /><p><br></p>`);
    onChange(sanitizeRichText(editor.innerHTML));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background focus-within:ring-3 focus-within:ring-ring/30">
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Bold" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bold")}><Bold /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Italic" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("italic")}><Italic /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Bullet list" title="Bullet list" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("insertUnorderedList")}><List /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Numbered list" title="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("insertOrderedList")}><ListOrdered /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Insert code block" title="Insert code block" onMouseDown={(event) => event.preventDefault()} onClick={insertCodeBlock}><Code2 /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Attach image" title="Attach image" onMouseDown={(event) => event.preventDefault()} onClick={() => imageInputRef.current?.click()}><ImagePlus /></Button>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { void attachImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Issue solution"
        data-placeholder={placeholder}
        className="solution-editor min-h-36 max-h-[32rem] overflow-y-auto px-3 py-3 text-sm leading-6 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        onInput={(event) => onChange(sanitizeRichText(event.currentTarget.innerHTML))}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain");
          if (text && /[{};]|\b(function|const|let|var|return|import|SELECT|FROM)\b/.test(text)) {
            event.preventDefault();
            const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            document.execCommand("insertHTML", false, `<pre><code>${escaped}</code></pre><p><br></p>`);
            if (editorRef.current) onChange(sanitizeRichText(editorRef.current.innerHTML));
          }
        }}
      />
      {imageError ? <p className="border-t px-3 py-2 text-xs text-destructive">{imageError}</p> : null}
    </div>
  );
}
