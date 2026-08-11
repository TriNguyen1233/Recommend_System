import React, { useState, useEffect, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $createParagraphNode,
  $getRoot,
  $createParagraphNode as $createParagraph,
} from 'lexical';

import { $createHeadingNode, HeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { LinkNode, TOGGLE_LINK_COMMAND, $isLinkNode } from '@lexical/link';
import { $findMatchingParent } from '@lexical/utils';

import '../css/editor.css';

// --- Icons SVG ---
const BoldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
  </svg>
);

const ItalicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4"></line>
    <line x1="14" y1="20" x2="5" y2="20"></line>
    <line x1="15" y1="4" x2="9" y2="20"></line>
  </svg>
);

const UnderlineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
    <line x1="4" y1="21" x2="20" y2="21"></line>
  </svg>
);

const LinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const ListBulletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

// --- Toolbar Plugin ---
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');

  // Cập nhật trạng thái Toolbar dựa theo vị trí con trỏ
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));

      // Kiểm tra xem vị trí hiện tại có phải thẻ Link không
      const node = selection.getNodes()[0];
      const parent = $findMatchingParent(node, $isLinkNode);
      setIsLink(parent !== null);

      // Nhận diện kiểu Block (P, H1, H2)
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root' 
        ? anchorNode 
        : anchorNode.getTopLevelElementOrThrow();

      if ($isHeadingNode(element)) {
        const tag = element.getTag();
        setBlockType(tag);
      } else {
        setBlockType('paragraph');
      }
    }
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

  // Thêm/Xóa Link
  const insertLink = () => {
    if (!isLink) {
      const url = prompt('Nhập địa chỉ đường dẫn (URL):', 'https://');
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  // Upload Ảnh dưới dạng HTML <img> trực tiếp
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Tự tạo DOM Element Image để chèn trực tiếp
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'editor-image';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';

        // Tải ảnh vào vị trí con trỏ
        const focusNode = selection.focus.getNode();
        if (focusNode) {
          const element = focusNode.getTopLevelElementOrThrow();
          element.insertAfter($createParagraph());
        }
      }
    });

    e.target.value = ''; // Reset input file
  };

  // Thay đổi kiểu định dạng Block
  const formatHeading = (headingType) => {
    if (blockType === headingType) return;

    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (headingType === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(headingType));
        }
      }
    });
  };

  return (
    <div className="editor-toolbar">
      {/* Dropdown chọn Heading tự động nhận diện */}
      <select 
        className="toolbar-select"
        value={blockType}
        onChange={(e) => formatHeading(e.target.value)}
      >
        <option value="paragraph">P </option>
        <option value="h1">H1 </option>
        <option value="h2">H2 </option>
      </select>

      <div className="toolbar-divider" />

      {/* Nút Format cơ bản */}
      <button
        type="button"
        className={`toolbar-btn ${isBold ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="In đậm (Ctrl+B)"
      >
        <BoldIcon />
      </button>

      <button
        type="button"
        className={`toolbar-btn ${isItalic ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="In nghiêng (Ctrl+I)"
      >
        <ItalicIcon />
      </button>

      <button
        type="button"
        className={`toolbar-btn ${isUnderline ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Gạch chân (Ctrl+U)"
      >
        <UnderlineIcon />
      </button>

      <div className="toolbar-divider" />

      {/* Danh sách List */}
      <button
        type="button"
        className="toolbar-btn"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        title="Danh sách gạch đầu dòng"
      >
        <ListBulletIcon />
      </button>

      {/* Chèn Link */}
      <button
        type="button"
        className={`toolbar-btn ${isLink ? 'active' : ''}`}
        onClick={insertLink}
        title="Chèn/Gỡ liên kết"
      >
        <LinkIcon />
      </button>

      {/* Upload Ảnh */}
      <label className="toolbar-btn upload-btn" title="Chèn hình ảnh">
        <ImageIcon />
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          style={{ display: 'none' }} 
        />
      </label>
    </div>
  );
}

// --- Main Editor Component ---
export default function BeautifulEditor({ onChange }) {
  const initialConfig = {
    namespace: 'BeautifulLexicalEditor',
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode], 
    theme: {
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        underline: 'editor-text-underline',
      },
      link: 'editor-link',
      heading: {
        h1: 'editor-heading-h1',
        h2: 'editor-heading-h2',
      },
      list: {
        ul: 'editor-list-ul',
        ol: 'editor-list-ol',
      },
    },
    onError: (error) => console.error(error),
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-wrapper">
        <ToolbarPlugin />

        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={
              <div className="editor-placeholder">
                Bắt đầu nhập nội dung tại đây...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        {onChange && <OnChangePlugin onChange={onChange} />}
      </div>
    </LexicalComposer>
  );
}