'use client';

import React from 'react';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className = '' }: MarkdownMessageProps) {
  if (!content) return null;

  // Split into lines to parse block elements (bullet lists, paragraphs)
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-ul`} className="list-disc pl-5 space-y-1.5 my-2">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Check for bullet list item (* or -)
    if (/^[\*\-]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[\*\-]\s+/, '');
      currentList.push(
        <li key={`li-${lineIdx}`} className="leading-relaxed">
          {renderFormattedInline(itemText)}
        </li>
      );
    } else {
      flushList(`flush-${lineIdx}`);
      if (trimmed.length > 0) {
        elements.push(
          <p key={`p-${lineIdx}`} className="leading-relaxed my-1">
            {renderFormattedInline(line)}
          </p>
        );
      }
    }
  });

  flushList('final-flush');

  return <div className={`space-y-1 text-sm ${className}`}>{elements}</div>;
}

/**
 * Parses inline formatting like **bold text** and `code/tool`
 */
function renderFormattedInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-foreground">
          {boldText}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeText = token.slice(1, -1);
      parts.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 rounded bg-muted-foreground/15 text-primary text-xs font-mono font-medium border border-primary/20"
        >
          {codeText}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
