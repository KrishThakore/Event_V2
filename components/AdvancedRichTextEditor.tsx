'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useCallback, useRef, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import EmojiPicker from 'emoji-picker-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import mammoth from 'mammoth';
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  List as ListIcon,
  ListOrdered as OrderedListIcon,
  Link as LinkIcon,
  Palette as ColorIcon,
  Type as FontIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Search as SearchIcon,
  Replace as ReplaceIcon,
  FileText as FileTextIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Copy as CopyIcon,
  Table as TableIcon,
  Quote as QuoteIcon,
  Minus as MinusIcon,
  Smile as SmileIcon,
  Hash as HashIcon,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Highlighter as HighlighterIcon,
  Text as TextIcon,
  Zap as ZapIcon
} from 'lucide-react';

interface AdvancedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'light' | 'dark';
  placeholder?: string;
  error?: string;
  maxLength?: number;
}

export const AdvancedRichTextEditor = ({
  value,
  onChange,
  variant = 'light',
  placeholder = 'Describe your event in detail',
  error,
  maxLength = 10000
}: AdvancedRichTextEditorProps) => {
  // Custom Popover component that handles viewport edge detection
  const CustomPopover = ({
    open, 
    onOpenChange, 
    trigger, 
    content, 
    align = 'center',
    side = 'bottom',
    sideOffset = 4,
    className = ''
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger: React.ReactNode;
    content: React.ReactNode;
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    className?: string;
  }) => {
    return (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>
          {trigger}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content 
            className={`fixed z-[9999] rounded-md border bg-white shadow-lg ${className}`}
            sideOffset={sideOffset}
            align={align}
            side={side}
            collisionPadding={8}
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              transform: side === 'top' ? 'translateY(-8px)' : 'translateY(8px)'
            }}
          >
            {content}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  };

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showBulletListDropdown, setShowBulletListDropdown] = useState(false);
  const [showNumberedListDropdown, setShowNumberedListDropdown] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showTextSizeInput, setShowTextSizeInput] = useState(false);
  const [customTextSize, setCustomTextSize] = useState('16');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const fonts = [
    { name: 'Sans Serif', value: 'system-ui, sans-serif' },
    { name: 'Serif', value: 'Georgia, serif' },
    { name: 'Monospace', value: 'Courier New, monospace' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Comic Sans', value: 'Comic Sans MS, cursive' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
  ];

  const textSizes = [
    { name: 'Small', value: '12px' },
    { name: 'Normal', value: '16px' },
    { name: 'Large', value: '20px' },
    { name: 'Huge', value: '24px' },
  ];

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#00ff88', '#ff0088'
  ];

  const highlightColors = [
    '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff8800', '#8800ff',
    '#ffcccc', '#ccffcc', '#ccccff', '#ffffcc', '#ffccff', '#ccffff'
  ];

  const bulletListStyles = [
    { name: 'Disc', value: 'disc', icon: '•' },
    { name: 'Circle', value: 'circle', icon: '○' },
    { name: 'Square', value: 'square', icon: '■' },
    { name: 'Diamond', value: 'diamond', icon: '◆' },
    { name: 'Dash', value: 'dash', icon: '–' },
    { name: 'Arrow', value: 'arrow', icon: '→' }
  ];

  const numberedListStyles = [
    { name: 'Decimal', value: 'decimal', icon: '1.' },
    { name: 'Alpha Lower', value: 'lower-alpha', icon: 'a.' },
    { name: 'Alpha Upper', value: 'upper-alpha', icon: 'A.' },
    { name: 'Roman Lower', value: 'lower-roman', icon: 'i.' },
    { name: 'Roman Upper', value: 'upper-roman', icon: 'I.' },
    { name: 'Decimal Leading Zero', value: 'decimal-leading-zero', icon: '01.' }
  ];

  const specialChars = [
    '©', '®', '™', '°', '±', '≤', '≥', '≠', '∞', '∑', '∏', 'π',
    'Ω', 'α', 'β', 'γ', 'δ', 'ε', 'λ', 'μ', 'σ', 'τ', 'φ', 'χ',
    '€', '£', '¥', '₹', '§', '¶', '†', '‡', '•', '…', '‰', '\u2032',
    '\u2033', '\u2039', '\u203A', '\u00AB', '\u00BB', '\u2013', '\u2014', '\u2018', '\u2019', '\u201C', '\u201D', '\u201B',
    '\u201E', '\u201B', '\u201F', '\u00A1', '\u00BF', '\u00AB', '\u00BB', '\u2039', '\u203A', '\u2022', '\u2026', '\u2030'
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Bold,
      Italic,
      Underline,
      Strike,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-inside',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-inside',
        },
      }),
      ListItem,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Blockquote,
      HorizontalRule,
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      updateWordCount(html);
    },
    editorProps: {
      attributes: {
        class: variant === 'light' 
          ? 'min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 prose prose-sm max-w-none'
          : 'min-h-[120px] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 prose prose-sm max-w-none prose-invert',
        placeholder: placeholder,
      },
    },
    immediatelyRender: false,
  });

  const updateWordCount = useCallback((html: string) => {
    const text = html.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const chars = text.length;
    setWordCount({ words, chars });
  }, []);

  // Keyboard shortcuts
  if (editor) {
    editor.view.dom.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            editor.chain().focus().toggleBold().run();
            break;
          case 'i':
            event.preventDefault();
            editor.chain().focus().toggleItalic().run();
            break;
          case 'u':
            event.preventDefault();
            editor.chain().focus().toggleUnderline().run();
            break;
          case 'z':
            if (event.shiftKey) {
              event.preventDefault();
              editor.chain().focus().redo().run();
            } else {
              event.preventDefault();
              editor.chain().focus().undo().run();
            }
            break;
          case 'y':
            event.preventDefault();
            editor.chain().focus().redo().run();
            break;
          case 'f':
            event.preventDefault();
            setShowFindReplace(true);
            break;
          case 'h':
            event.preventDefault();
            setShowFindReplace(true);
            break;
        }
      }
    });
  }

  const setLink = () => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  };

  const unsetLink = () => {
    editor?.chain().focus().unsetLink().run();
  };

  const handleEmojiSelect = (emoji: any) => {
    editor?.chain().focus().insertContent(emoji.emoji).run();
    setShowEmojiPicker(false);
  };

  const handleSpecialCharSelect = (char: string) => {
    editor?.chain().focus().insertContent(char).run();
    setShowSpecialChars(false);
  };

  const findAndReplace = () => {
    if (!findText || !editor) return;
    
    const content = editor.getHTML();
    const regex = new RegExp(findText, 'gi');
    const newContent = content.replace(regex, replaceText);
    editor.commands.setContent(newContent);
  };

  const exportToPDF = async () => {
    if (!editorRef.current) return;
    
    const canvas = await html2canvas(editorRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    pdf.save('event-description.pdf');
  };

  const exportToWord = () => {
    const content = editor?.getHTML() || '';
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'event-description.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAsHTML = () => {
    const content = editor?.getHTML() || '';
    navigator.clipboard.writeText(content);
  };

  const importHTML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      editor?.commands.setContent(content);
    };
    reader.readAsText(file);
  };

  const pasteFromWord = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor?.commands.setContent(text);
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
    }
  };

  const importDOCX = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      if (result.messages.length > 0) {
        console.log('DOCX conversion messages:', result.messages);
      }
      
      // Clean up the HTML and set it in the editor
      const cleanedHtml = result.value
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove styles
        .replace(/<meta[^>]*>/gi, '') // Remove meta tags
        .replace(/<link[^>]*>/gi, '') // Remove link tags
        .replace(/xml:[^>]*>/gi, '') // Remove XML namespaces
        .replace(/xmlns[^>]*>/gi, ''); // Remove xmlns attributes
      
      editor?.commands.setContent(cleanedHtml);
      updateWordCount(cleanedHtml);
      
      toast.success('DOCX imported successfully');
    } catch (error) {
      console.error('Error importing DOCX:', error);
      toast.error('Failed to import DOCX file. Please try again.');
    }
    
    // Reset the file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
    setShowTableDialog(false);
  };

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-visible relative">
      {/* Toolbar */}
      <div className={`border-b p-2 flex flex-wrap gap-1 relative z-10 ${variant === 'light' ? 'bg-gray-50 border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
        
        {/* Basic Formatting */}
        <div className="flex gap-1 border-r pr-2">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Bold (Ctrl+B)">
            <BoldIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Italic (Ctrl+I)">
            <ItalicIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Underline (Ctrl+U)">
            <UnderlineIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Strikethrough">
            <StrikeIcon size={16} />
          </button>
        </div>

        {/* Text Size & Style */}
        <div className="flex gap-1 border-r pr-2">
          <div className="relative">
            <button onClick={() => setShowTextSizeInput(!showTextSizeInput)} className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Text Size">
              <TextIcon size={16} />
            </button>
            {showTextSizeInput && (
              <div className={`absolute top-full left-0 mt-1 p-3 rounded shadow-lg border z-10 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={customTextSize}
                    onChange={(e) => setCustomTextSize(e.target.value)}
                    className={`w-20 px-2 py-1 border rounded text-sm ${variant === 'light' ? 'border-gray-300 text-gray-900' : 'border-slate-600 text-white bg-slate-800'}`}
                    placeholder="px"
                  />
                  <span className={`text-sm ${variant === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>px</span>
                  <button
                    onClick={() => {
                      const selectedText = editor?.state.doc.textBetween(
                        editor.state.selection.from,
                        editor.state.selection.to
                      );
                      
                      if (selectedText) {
                        editor?.chain().focus()
                          .insertContent(`<span style="font-size: ${customTextSize}px">${selectedText}</span>`)
                          .run();
                      } else {
                        editor?.chain().focus()
                          .insertContent(`<span style="font-size: ${customTextSize}px">Sample text</span>`)
                          .run();
                      }
                      
                      setShowTextSizeInput(false);
                    }}
                    className={`px-3 py-1 text-sm rounded ${variant === 'light' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-500 text-white hover:bg-purple-600'}`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <CustomPopover
              open={showFontDropdown}
              onOpenChange={setShowFontDropdown}
              trigger={
                <button className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Font Family">
                  <FontIcon size={16} />
                </button>
              }
              content={
                <div className={`p-2 rounded shadow-xl border w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                  {fonts.map((font) => (
                    <button key={font.value} onClick={() => { editor.chain().focus().setFontFamily(font.value).run(); setShowFontDropdown(false); }} className={`w-full text-left px-2 py-1 rounded text-sm ${variant === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-slate-600'}`} style={{ fontFamily: font.value }}>
                      {font.name}
                    </button>
                  ))}
                </div>
              }
              align="start"
              side="bottom"
              sideOffset={4}
            />
          </div>
        </div>

        {/* Text Colors */}
        <div className="flex gap-1 border-r pr-2">
          <CustomPopover
            open={showColorPicker}
            onOpenChange={setShowColorPicker}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Text Color">
                <ColorIcon size={16} />
              </button>
            }
            content={
              <div className={`p-3 rounded shadow-lg border z-50 w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <h4 className={`text-sm font-medium mb-2 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Text Color</h4>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:ring-2 hover:ring-offset-1 hover:ring-blue-500 transition-all"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Custom:</span>
                  <div className="flex items-center">
                    <input
                      type="color"
                      onChange={(e) => {
                        editor.chain().focus().setColor(e.target.value).run();
                        setShowColorPicker(false);
                      }}
                      className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                      title="Select custom color"
                    />
                  </div>
                </div>
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
          <CustomPopover
            open={showHighlightPicker}
            onOpenChange={setShowHighlightPicker}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Highlight">
                <HighlighterIcon size={16} />
              </button>
            }
            content={
              <div className={`p-3 rounded shadow-lg border z-20 w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <h4 className={`text-sm font-medium mb-2 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Highlight Color</h4>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {highlightColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => { 
                        editor?.chain().focus().toggleHighlight({ color }).run(); 
                        setShowHighlightPicker(false); 
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:ring-2 hover:ring-offset-1 hover:ring-blue-500 transition-all"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Custom:</span>
                  <div className="flex items-center">
                    <input
                      type="color"
                      value={editor?.getAttributes('highlight').color || '#ffff00'}
                      onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                      className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                      title="Select custom highlight color"
                    />
                  </div>
                </div>
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
        </div>

        {/* Subscript/Superscript */}
        <div className="flex gap-1 border-r pr-2">
          <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('subscript') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Subscript">
            <SubscriptIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('superscript') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Superscript">
            <SuperscriptIcon size={16} />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r pr-2">
          <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Align Left">
            <AlignLeftIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Align Center">
            <AlignCenterIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Align Right">
            <AlignRightIcon size={16} />
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r pr-2">
          <CustomPopover
            open={showBulletListDropdown}
            onOpenChange={setShowBulletListDropdown}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Bullet List">
                <ListIcon size={16} />
              </button>
            }
            content={
              <div className={`p-3 rounded shadow-lg border z-50 w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <h4 className={`text-sm font-medium mb-2 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Bullet List Style</h4>
                <div className="space-y-1">
                  {bulletListStyles.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => {
                        editor?.chain().focus().toggleBulletList().updateAttributes('bulletList', { type: style.value }).run();
                        setShowBulletListDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}
                    >
                      <span className="text-lg">{style.icon}</span>
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
          <CustomPopover
            open={showNumberedListDropdown}
            onOpenChange={setShowNumberedListDropdown}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Numbered List">
                <OrderedListIcon size={16} />
              </button>
            }
            content={
              <div className={`p-3 rounded shadow-lg border z-50 w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <h4 className={`text-sm font-medium mb-2 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Numbered List Style</h4>
                <div className="space-y-1">
                  {numberedListStyles.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => {
                        editor?.chain().focus().toggleOrderedList().updateAttributes('orderedList', { type: style.value }).run();
                        setShowNumberedListDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}
                    >
                      <span className="text-lg">{style.icon}</span>
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r pr-2">
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Heading 1">
            <HashIcon size={16} className="font-bold" />
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Heading 2">
            <HashIcon size={14} className="font-semibold" />
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Heading 3">
            <HashIcon size={12} />
          </button>
        </div>

        {/* Advanced Content */}
        <div className="flex gap-1 border-r pr-2">
          <div className="relative">
            <button onClick={() => setShowTableDialog(!showTableDialog)} className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Insert Table">
              <TableIcon size={16} />
            </button>
            {showTableDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                <div className={`rounded-lg p-4 w-80 ${variant === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
                  <h3 className={`font-semibold mb-3 ${variant === 'light' ? 'text-gray-900' : 'text-white'}`}>Insert Table</h3>
                  <div className="flex gap-4 mb-3">
                    <div className="flex-1">
                      <label className={`block text-sm font-medium mb-1 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Rows</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={tableRows}
                        onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                        className={`w-full p-2 rounded border ${variant === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-700 text-white'}`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block text-sm font-medium mb-1 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Columns</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={tableCols}
                        onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                        className={`w-full p-2 rounded border ${variant === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-700 text-white'}`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowTableDialog(false)} className={`px-3 py-1 rounded ${variant === 'light' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-slate-600 text-white hover:bg-slate-500'}`}>Cancel</button>
                    <button onClick={insertTable} className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700">Insert Table</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Block Quote">
            <QuoteIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Horizontal Rule">
            <MinusIcon size={16} />
          </button>
        </div>

        {/* Special Characters */}
        <div className="flex gap-1 border-r pr-2">
          <CustomPopover
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Emoji Picker">
                <SmileIcon size={16} />
              </button>
            }
            content={
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80">
                <EmojiPicker 
                  onEmojiClick={handleEmojiSelect}
                  width="100%"
                  height={400}
                  searchPlaceholder="Search emojis..."
                  previewConfig={{
                    showPreview: false
                  }}
                  skinTonesDisabled
                />
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
          <CustomPopover
            open={showSpecialChars}
            onOpenChange={setShowSpecialChars}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Special Characters">
                <ZapIcon size={16} />
              </button>
            }
            content={
              <div className={`p-3 rounded shadow-xl border w-72 max-h-64 overflow-y-auto ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <h4 className={`text-sm font-medium mb-2 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Special Characters</h4>
                <div className="grid grid-cols-8 gap-2">
                  {specialChars.map((char: string, index: number) => (
                    <button 
                      key={index}
                      onClick={() => handleSpecialCharSelect(char)}
                      className={`p-1 text-sm rounded hover:bg-gray-100 ${variant === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-slate-600'}`}
                      title={char}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
        </div>

        {/* Link */}
        <div className="flex gap-1 border-r pr-2">
          <button onClick={() => { if (editor.isActive('link')) { unsetLink(); } else { setShowLinkDialog(true); } }} className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Link">
            <LinkIcon size={16} />
          </button>
        </div>

        {/* Document Tools */}
        <div className="flex gap-1 border-r pr-2">
          <button onClick={() => setShowFindReplace(!showFindReplace)} className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Find & Replace (Ctrl+F)">
            <SearchIcon size={16} />
          </button>
          <CustomPopover
            open={showExportOptions}
            onOpenChange={setShowExportOptions}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Export">
                <DownloadIcon size={16} />
              </button>
            }
            content={
              <div className={`p-3 rounded shadow-lg border z-50 w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <h4 className={`text-sm font-medium mb-2 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Export Options</h4>
                <div className="space-y-1">
                  <button onClick={exportToPDF} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}>
                    <FileTextIcon size={16} />
                    Export to PDF
                  </button>
                  <button onClick={exportToWord} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}>
                    <FileTextIcon size={16} />
                    Export to Word
                  </button>
                  <button onClick={copyAsHTML} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}>
                    <CopyIcon size={16} />
                    Copy as HTML
                  </button>
                </div>
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
          <CustomPopover
            open={showImportOptions}
            onOpenChange={setShowImportOptions}
            trigger={
              <button className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Import">
                <UploadIcon size={16} />
              </button>
            }
            content={
              <div className={`p-3 rounded shadow-lg border z-50 w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                <h4 className={`text-sm font-medium mb-2 ${variant === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Import Options</h4>
                <div className="space-y-1">
                  <button onClick={pasteFromWord} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}>
                    <FileTextIcon size={16} />
                    Paste from Word
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}>
                    <UploadIcon size={16} />
                    Import HTML
                  </button>
                  <button onClick={() => docxInputRef.current?.click()} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 flex items-center gap-2 ${variant === 'light' ? 'text-gray-700' : 'text-white hover:bg-slate-600'}`}>
                    <UploadIcon size={16} />
                    Import DOCX
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={importHTML} className="hidden" />
                <input ref={docxInputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={importDOCX} className="hidden" />
              </div>
            }
            align="start"
            side="bottom"
            sideOffset={4}
          />
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <button onClick={() => editor.chain().focus().undo().run()} className={`p-2 rounded hover:bg-gray-200 ${!editor.can().undo() ? 'opacity-50 cursor-not-allowed' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Undo (Ctrl+Z)">
            <UndoIcon size={16} />
          </button>
          <button onClick={() => editor.chain().focus().redo().run()} className={`p-2 rounded hover:bg-gray-200 ${!editor.can().redo() ? 'opacity-50 cursor-not-allowed' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`} title="Redo (Ctrl+Y)">
            <RedoIcon size={16} />
          </button>
        </div>
      </div>

      {/* Word Count Display */}
      <div className={`px-3 py-1 text-xs ${variant === 'light' ? 'bg-gray-50 text-gray-600 border-gray-300' : 'bg-slate-700 text-slate-400 border-slate-600'} border-b`}>
        Words: {wordCount.words} | Characters: {wordCount.chars} {maxLength && `/ ${maxLength}`}
      </div>

      {/* Editor Content */}
      <div className="relative z-0">
        <div ref={editorRef}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Find & Replace Dialog */}
      {showFindReplace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className={`rounded-lg p-4 w-96 ${variant === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
            <h3 className={`font-semibold mb-3 ${variant === 'light' ? 'text-gray-900' : 'text-white'}`}>Find & Replace</h3>
            <input type="text" value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Find text" className={`w-full p-2 rounded border mb-2 ${variant === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-700 text-white'}`} />
            <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace with" className={`w-full p-2 rounded border mb-3 ${variant === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-700 text-white'}`} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFindReplace(false)} className={`px-3 py-1 rounded ${variant === 'light' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-slate-600 text-white hover:bg-slate-500'}`}>Cancel</button>
              <button onClick={findAndReplace} className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700">Replace</button>
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-4 w-96 ${variant === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
            <h3 className={`font-semibold mb-3 ${variant === 'light' ? 'text-gray-900' : 'text-white'}`}>Add Link</h3>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className={`w-full p-2 rounded border ${variant === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-700 text-white'}`} autoFocus />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setShowLinkDialog(false); setLinkUrl(''); }} className={`px-3 py-1 rounded ${variant === 'light' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-slate-600 text-white hover:bg-slate-500'}`}>Cancel</button>
              <button onClick={setLink} className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700">Add Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
