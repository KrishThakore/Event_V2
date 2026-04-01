'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
import { useState } from 'react';
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
  Redo as RedoIcon
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'light' | 'dark';
  placeholder?: string;
  error?: string;
}

export function RichTextEditor({ value, onChange, variant = 'light', placeholder = 'Describe your event in detail', error }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showFontDropdown, setShowFontDropdown] = useState(false);

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

  const editor = useEditor({
    immediatelyRender: false,
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
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: variant === 'light' 
          ? 'min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 prose prose-sm max-w-none'
          : 'min-h-[120px] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 prose prose-sm max-w-none prose-invert',
        placeholder: placeholder,
      },
    },
  });

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

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#00ff88', '#ff0088'
  ];

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className={`border-b p-2 flex flex-wrap gap-1 ${variant === 'light' ? 'bg-gray-50 border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
        {/* Text Formatting */}
        <div className="flex gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Bold (Ctrl+B)"
          >
            <BoldIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Italic (Ctrl+I)"
          >
            <ItalicIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Strikethrough"
          >
            <StrikeIcon size={16} />
          </button>
        </div>

        {/* Text Alignment */}
        <div className="flex gap-1">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Align Left"
          >
            <AlignLeftIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Align Center"
          >
            <AlignCenterIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Align Right"
          >
            <AlignRightIcon size={16} />
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Bullet List"
          >
            <ListIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Numbered List"
          >
            <OrderedListIcon size={16} />
          </button>
        </div>

        {/* Font Family */}
        <div className="relative">
          <button
            onClick={() => setShowFontDropdown(!showFontDropdown)}
            className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Font Family"
          >
            <FontIcon size={16} />
          </button>
          {showFontDropdown && (
            <div className={`absolute top-full left-0 mt-1 p-2 rounded shadow-lg border z-10 w-48 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
              <div className="space-y-1">
                {fonts.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => {
                      editor.chain().focus().setFontFamily(font.value).run();
                      setShowFontDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-200 ${variant === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-slate-600'}`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Headings */}
        <div className="flex gap-1">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Heading 1"
          >
            <FontIcon size={16} className="font-bold" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Heading 2"
          >
            <FontIcon size={14} className="font-semibold" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Heading 3"
          >
            <FontIcon size={12} />
          </button>
        </div>

        {/* Color */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`p-2 rounded hover:bg-gray-200 ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Text Color"
          >
            <ColorIcon size={16} />
          </button>
          {showColorPicker && (
            <div className={`absolute top-full left-0 mt-1 p-2 rounded shadow-lg border z-10 ${variant === 'light' ? 'bg-white border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
              <div className="grid grid-cols-6 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Link */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              if (editor.isActive('link')) {
                unsetLink();
              } else {
                setShowLinkDialog(true);
              }
            }}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Link"
          >
            <LinkIcon size={16} />
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            className={`p-2 rounded hover:bg-gray-200 ${!editor.can().undo() ? 'opacity-50 cursor-not-allowed' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            className={`p-2 rounded hover:bg-gray-200 ${!editor.can().redo() ? 'opacity-50 cursor-not-allowed' : ''} ${variant === 'dark' ? 'hover:bg-slate-600 text-white' : 'text-gray-700'}`}
            title="Redo (Ctrl+Y)"
          >
            <RedoIcon size={16} />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-4 w-96 ${variant === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
            <h3 className={`font-semibold mb-3 ${variant === 'light' ? 'text-gray-900' : 'text-white'}`}>
              Add Link
            </h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className={`w-full p-2 rounded border ${variant === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-700 text-white'}`}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }}
                className={`px-3 py-1 rounded ${variant === 'light' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
              >
                Cancel
              </button>
              <button
                onClick={setLink}
                className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
              >
                Add Link
              </button>
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
