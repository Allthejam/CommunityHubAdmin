"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Quote,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  Undo2,
  Redo2,
  Eraser,
  Code,
  Eye,
  Edit3,
  Maximize2,
  Minimize2,
  FileText,
  Sparkles,
  ClipboardPaste,
  Table as TableIcon,
  Minus,
  AlertCircle,
  HelpCircle,
  Check
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hideHeading?: boolean;
  hideQuote?: boolean;
  hideFontSize?: boolean;
  hideColor?: boolean;
  minHeight?: string;
};

const PREDEFINED_COLORS = [
  "#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1",
  "#dc2626", "#ea580c", "#d97706", "#16a34a", "#0284c7", "#4f46e5", "#7c3aed", "#c026d3"
];

const PREDEFINED_HIGHLIGHTS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e2e8f0"
];

/**
 * Intelligent Cleaner for Microsoft Word, Google Docs, or plain text pastes.
 * Preserves paragraphs, headings, lists, bold, italics, tables, and removes Word XML garbage.
 */
export function cleanPastedContent(rawHtml: string, plainText: string): string {
  // 1. Check if Word/Rich HTML is present
  const isWordHtml = rawHtml && (
    rawHtml.includes("MsoNormal") ||
    rawHtml.includes("mso-") ||
    rawHtml.includes("urn:schemas-microsoft-com") ||
    rawHtml.includes("class=WordSection") ||
    rawHtml.includes("<![if") ||
    rawHtml.includes("<w:WordDocument>")
  );

  if (isWordHtml || (rawHtml && rawHtml.includes("<p") && rawHtml.length > 50)) {
    let cleaned = rawHtml;

    // Remove Word XML, Office namespaces, conditional comments, headers/footers
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
    cleaned = cleaned.replace(/<xml[\s\S]*?<\/xml>/gi, "");
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");
    cleaned = cleaned.replace(/<meta[\s\S]*?>/gi, "");
    cleaned = cleaned.replace(/<link[\s\S]*?>/gi, "");
    cleaned = cleaned.replace(/<o:p[\s\S]*?<\/o:p>/gi, "");
    cleaned = cleaned.replace(/<\/?(o|w|m|v|x):[a-z0-9_-]+[^>]*>/gi, "");

    // Strip mso-* styles and classes
    cleaned = cleaned.replace(/class="?Mso[a-zA-Z0-9_-]+"?/gi, "");
    cleaned = cleaned.replace(/class='?Mso[a-zA-Z0-9_-]+'?/gi, "");
    cleaned = cleaned.replace(/style="[^"]*mso-[^"]*"/gi, "");
    cleaned = cleaned.replace(/style='[^']*mso-[^']*'/gi, "");

    // Remove Calibri/font-family overrides that break theme
    cleaned = cleaned.replace(/font-family:[^;"]*(;|")/gi, "$1");

    // Convert Word heading classes to clean semantic headings
    cleaned = cleaned.replace(/<p[^>]*class="?Heading1"?[^>]*>(.*?)<\/p>/gi, "<h2>$1</h2>");
    cleaned = cleaned.replace(/<p[^>]*class="?Heading2"?[^>]*>(.*?)<\/p>/gi, "<h3>$1</h3>");
    cleaned = cleaned.replace(/<p[^>]*class="?Heading3"?[^>]*>(.*?)<\/p>/gi, "<h4>$1</h4>");

    // Convert paragraph blocks that look like numbered clauses (e.g. "1. DEFINITIONS", "2.1 Scope") to h3
    cleaned = cleaned.replace(/<p[^>]*><b[^>]*>(\d+(\.\d+)*\s+[A-Z][^<]{2,60})<\/b><\/p>/gi, "<h3>$1</h3>");
    cleaned = cleaned.replace(/<p[^>]*><strong[^>]*>(\d+(\.\d+)*\s+[A-Z][^<]{2,60})<\/strong><\/p>/gi, "<h3>$1</h3>");

    // Remove empty paragraphs
    cleaned = cleaned.replace(/<p[^>]*>\s*(&nbsp;|\s)*\s*<\/p>/gi, "");

    // Ensure paragraphs are properly spaced
    return cleaned.trim();
  }

  // 2. Fallback: Parse plain text with double/single linebreaks into HTML paragraphs
  if (plainText) {
    const rawParagraphs = plainText.split(/\r?\n\r?\n+/);
    const cleanedParagraphs = rawParagraphs
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        // Heading detection for numbered clauses
        if (/^(\d+(\.\d+)*\s+[A-Z0-9\s]{3,}|SECTION\s+\d+|ARTICLE\s+\d+|SCHEDULE\s+\d+)/i.test(p) && p.length < 90) {
          return `<h3>${p.replace(/\r?\n/g, '<br />')}</h3>`;
        }

        // Bullet list detection
        if (/^[•\-\*]\s+/.test(p)) {
          const lines = p.split(/\r?\n/).map(l => l.replace(/^[•\-\*]\s+/, '').trim()).filter(Boolean);
          return `<ul>${lines.map(item => `<li>${item}</li>`).join('')}</ul>`;
        }

        // Numbered list detection (e.g. "1.", "2.", "a.", "(i)")
        if (/^(\d+\.|\([a-z0-9]+\)|[a-z]\.)\s+/i.test(p)) {
          const lines = p.split(/\r?\n/).map(l => l.replace(/^(\d+\.|\([a-z0-9]+\)|[a-z]\.)\s+/i, '').trim()).filter(Boolean);
          return `<ol>${lines.map(item => `<li>${item}</li>`).join('')}</ol>`;
        }

        // Standard paragraph with linebreaks preserved
        const withBreaks = p.replace(/\r?\n/g, '<br />');
        return `<p>${withBreaks}</p>`;
      });

    return cleanedParagraphs.join('\n');
  }

  return rawHtml || "";
}

export function RichTextEditor({ 
    value, 
    onChange, 
    placeholder = "Type or paste your legal document content here...",
    hideHeading = false,
    hideQuote = false,
    hideFontSize = false,
    hideColor = false,
    minHeight = "480px"
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [color, setColor] = React.useState("#0f172a");
  const [activeTab, setActiveTab] = React.useState<"visual" | "code" | "preview">("visual");
  const [rawHtmlText, setRawHtmlText] = React.useState(value || "");
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = React.useState(false);
  const [pasteModalText, setPasteModalText] = React.useState("");

  // Sync internal raw HTML when external value changes
  React.useEffect(() => {
    if (value !== rawHtmlText) {
      setRawHtmlText(value || "");
    }
  }, [value]);

  // Sync contentEditable innerHTML when external value changes
  React.useEffect(() => {
    if (editorRef.current && activeTab === "visual") {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, activeTab]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setRawHtmlText(html);
    onChange(html);
  };
  
  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setRawHtmlText(html);
      onChange(html);
    }
  };

  /**
   * Native onPaste Interceptor:
   * Prevents Word from collapsing into a single paragraph!
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    const cleaned = cleanPastedContent(html, text);

    // Insert clean HTML at current cursor position
    if (document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, cleaned);
    } else {
      // Fallback
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = cleaned;
        const frag = document.createDocumentFragment();
        let node;
        while ((node = tempDiv.firstChild)) {
          frag.appendChild(node);
        }
        range.insertNode(frag);
      }
    }

    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setRawHtmlText(newHtml);
      onChange(newHtml);
    }
  };

  const handleApplyCleanPasteModal = () => {
    const cleaned = cleanPastedContent("", pasteModalText);
    const newHtml = value ? `${value}\n${cleaned}` : cleaned;
    setRawHtmlText(newHtml);
    onChange(newHtml);
    setPasteModalText("");
    setIsPasteModalOpen(false);
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    handleCommand("foreColor", newColor);
  };

  const handleHighlightChange = (bgColor: string) => {
    handleCommand("hiliteColor", bgColor);
  };

  const handleRawHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    setRawHtmlText(newHtml);
    onChange(newHtml);
  };

  const insertLegalNoticeBox = () => {
    const noticeHtml = `
      <div style="background-color: rgba(99, 102, 241, 0.08); border-left: 4px solid #6366f1; padding: 14px 18px; margin: 16px 0; border-radius: 6px;">
        <strong style="color: #4f46e5; display: block; margin-bottom: 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">IMPORTANT LEGAL NOTICE</strong>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: inherit;">Please insert your binding terms, disclaimers, or statutory regulatory notice here.</p>
      </div>
    `;
    if (document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, noticeHtml);
    }
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setRawHtmlText(html);
      onChange(html);
    }
  };

  const insertLegalTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
        <thead>
          <tr style="background-color: rgba(100, 116, 139, 0.1); border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Section / Clause</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Requirement & Description</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Effective Scope</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">1.0 Eligibility</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">Users must be at least 18 years of age or authorized business representatives.</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">Platform-wide</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">2.0 Data Privacy</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">Compliance with UK GDPR and Data Protection Act 2018.</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">All Members</td>
          </tr>
        </tbody>
      </table>
    `;
    if (document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, tableHtml);
    }
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setRawHtmlText(html);
      onChange(html);
    }
  };

  // Stats calculation
  const stats = React.useMemo(() => {
    const textOnly = (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = textOnly ? textOnly.split(" ").length : 0;
    const chars = textOnly.length;
    const paragraphs = (value || "").match(/<p|<h[1-6]|<li/gi)?.length || (textOnly ? 1 : 0);
    const readingTime = Math.ceil(words / 200);
    return { words, chars, paragraphs, readingTime };
  }, [value]);

  return (
    <div className={cn(
      "w-full rounded-xl border-2 border-border/80 bg-card overflow-hidden shadow-sm transition-all",
      isFullscreen && "fixed inset-0 z-50 rounded-none border-0 h-screen flex flex-col bg-background"
    )}>
      {/* Top Header Bar with Mode Switcher & Actions */}
      <div className="p-2.5 bg-muted/40 border-b border-border/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="h-8 bg-background/80 border p-0.5">
              <TabsTrigger value="visual" className="text-xs gap-1.5 px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Edit3 className="h-3.5 w-3.5" /> Visual Editor
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs gap-1.5 px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Code className="h-3.5 w-3.5" /> HTML Source
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1.5 px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Eye className="h-3.5 w-3.5" /> Live Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono text-muted-foreground">
            {stats.words.toLocaleString()} words &bull; {stats.readingTime} min read
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Dedicated Word Paste Tool Modal */}
          <Dialog open={isPasteModalOpen} onOpenChange={setIsPasteModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800">
                <ClipboardPaste className="h-3.5 w-3.5 text-indigo-600" />
                <span>Paste from Word</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                  <FileText className="h-4 w-4" /> Word &amp; Document Cleaner
                </div>
                <DialogTitle className="text-xl font-black">
                  Paste &amp; Format from Microsoft Word
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Paste raw text or formatted clauses from Word or Docs below. We automatically clean messy XML and retain proper paragraphs, numbered clauses, and list formatting.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 flex-1 min-h-[220px]">
                <Textarea 
                  placeholder="Paste your Word document text or clauses here (Ctrl + V)..." 
                  value={pasteModalText}
                  onChange={(e) => setPasteModalText(e.target.value)}
                  className="w-full h-56 font-sans text-xs leading-relaxed border-2"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" size="sm" onClick={() => setIsPasteModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleApplyCleanPasteModal} disabled={!pasteModalText.trim()} className="font-bold gap-1.5">
                  <Sparkles className="h-4 w-4" /> Clean &amp; Insert into Document
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 p-0"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar (Active in Visual Mode) */}
      {activeTab === "visual" && (
        <div className="p-2 border-b bg-muted/20 flex flex-wrap items-center gap-1 select-none">
          {/* History Undo / Redo */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCommand("undo")} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCommand("redo")} title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Heading / Structure Selector */}
          {!hideHeading && (
            <Select onValueChange={(tag) => handleCommand("formatBlock", tag)}>
              <SelectTrigger className="w-[145px] h-8 text-xs font-semibold px-2.5 bg-background">
                <SelectValue placeholder="Paragraph Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<p>">Normal Paragraph</SelectItem>
                <SelectItem value="<h1>" className="font-black text-base">H1 Document Title</SelectItem>
                <SelectItem value="<h2>" className="font-bold text-sm">H2 Main Section</SelectItem>
                <SelectItem value="<h3>" className="font-semibold text-xs">H3 Subsection</SelectItem>
                <SelectItem value="<h4>" className="font-medium text-xs">H4 Minor Clause</SelectItem>
                <SelectItem value="<blockquote>" className="italic">Blockquote</SelectItem>
                <SelectItem value="<pre>" className="font-mono text-xs">Code / Preformatted</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Font Styles: Bold, Italic, Underline, Strike */}
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("bold")} title="Bold (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("italic")} title="Italic (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("underline")} title="Underline (Ctrl+U)">
            <Underline className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("strikeThrough")} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </Toggle>

          {/* Text Color Picker */}
          {!hideColor && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text Color">
                  <Palette className="h-4 w-4 text-indigo-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 space-y-3" align="start">
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">Text Color</Label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {PREDEFINED_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(c)}
                        className="h-6 w-6 rounded-md border shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">Highlight Background</Label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {PREDEFINED_HIGHLIGHTS.map(bg => (
                      <button
                        key={bg}
                        onClick={() => handleHighlightChange(bg)}
                        className="h-6 w-6 rounded-md border shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: bg }}
                        title={bg}
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Alignment */}
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("justifyLeft")} title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("justifyCenter")} title="Align Center">
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("justifyRight")} title="Align Right">
            <AlignRight className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("justifyFull")} title="Justify Text">
            <AlignJustify className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Lists & Indentation */}
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("insertUnorderedList")} title="Bullet List">
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" className="h-8 w-8 p-0" onPressedChange={() => handleCommand("insertOrderedList")} title="Numbered Clause List">
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCommand("indent")} title="Increase Indent">
            <Indent className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCommand("outdent")} title="Decrease Indent">
            <Outdent className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Legal Structural Inserts */}
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground" onClick={() => handleCommand("insertHorizontalRule")} title="Insert Section Divider Line">
            <Minus className="h-3.5 w-3.5" /> <span className="hidden md:inline">Divider</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950" onClick={insertLegalNoticeBox} title="Insert Highlighted Legal Notice Box">
            <AlertCircle className="h-3.5 w-3.5" /> <span className="hidden md:inline">Notice Box</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground" onClick={insertLegalTable} title="Insert Comparison / Clause Table">
            <TableIcon className="h-3.5 w-3.5" /> <span className="hidden md:inline">Table</span>
          </Button>

          {/* Clear Formatting */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive ml-auto" onClick={() => handleCommand("removeFormat")} title="Clear Formatting on Selected Text">
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Editor Body */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Tab 1: Visual WYSIWYG Editor */}
        {activeTab === "visual" && (
          <div 
            className="w-full h-full overflow-y-auto p-6 sm:p-8 bg-background/50 focus-within:bg-background transition-colors"
            style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : minHeight }}
          >
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onPaste={handlePaste}
              data-placeholder={placeholder}
              className="outline-none min-h-full prose dark:prose-invert max-w-none prose-headings:font-headline prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-lg prose-p:leading-relaxed prose-p:my-3 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:float-left empty:before:pointer-events-none text-foreground font-sans text-sm sm:text-base leading-relaxed"
            />
          </div>
        )}

        {/* Tab 2: HTML Source Code View */}
        {activeTab === "code" && (
          <div className="w-full h-full p-4 bg-slate-950 text-slate-100 font-mono text-xs">
            <Textarea 
              value={rawHtmlText}
              onChange={handleRawHtmlChange}
              placeholder="<p>Your HTML document content here...</p>"
              className="w-full h-full min-h-[440px] font-mono text-xs leading-relaxed bg-transparent border-0 text-slate-100 resize-none focus-visible:ring-0"
              style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : minHeight }}
            />
          </div>
        )}

        {/* Tab 3: Live Document Preview */}
        {activeTab === "preview" && (
          <div 
            className="w-full h-full overflow-y-auto p-6 sm:p-10 bg-muted/30"
            style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : minHeight }}
          >
            <div className="max-w-3xl mx-auto bg-card p-8 sm:p-12 rounded-xl shadow-md border border-border/80">
              <div className="border-b pb-4 mb-6">
                <Badge variant="secondary" className="mb-2 uppercase text-[10px] font-bold">Document Preview</Badge>
                <h1 className="text-2xl font-black font-headline text-foreground">Terms &amp; Regulatory Agreement</h1>
                <p className="text-xs text-muted-foreground mt-1">This is how your document renders to members and users across Community Hub.</p>
              </div>
              <div 
                className="prose dark:prose-invert max-w-none text-foreground font-sans leading-relaxed text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: value || "<p class='text-muted-foreground italic'>No content written yet.</p>" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Footer */}
      <div className="px-4 py-2 bg-muted/40 border-t border-border/70 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground font-medium">
        <div className="flex items-center gap-4">
          <span><strong>{stats.words.toLocaleString()}</strong> words</span>
          <span><strong>{stats.chars.toLocaleString()}</strong> characters</span>
          <span><strong>{stats.paragraphs}</strong> blocks</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Check className="h-3 w-3" /> Auto-formatting &amp; Word Cleaner Active
          </span>
        </div>
      </div>
    </div>
  );
}

