'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type { SwiftFile } from '../page';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  files: SwiftFile[];
  activeFile: string | null;
  streamingFile: string | null;  // filename currently being streamed
  onFileSelect: (filename: string) => void;
  onFileChange: (filename: string, content: string) => void;
};

// ─── Swift language tokenizer ────────────────────────────────────────────────

const SWIFT_KEYWORDS = [
  'import', 'struct', 'class', 'enum', 'protocol', 'extension', 'func',
  'var', 'let', 'if', 'else', 'guard', 'return', 'for', 'in', 'while',
  'switch', 'case', 'default', 'break', 'continue', 'where', 'is', 'as',
  'try', 'catch', 'throw', 'throws', 'async', 'await', 'actor',
  'static', 'final', 'override', 'private', 'public', 'internal', 'open',
  'fileprivate', 'init', 'deinit', 'self', 'super', 'nil', 'true', 'false',
  'some', 'any', 'inout', 'mutating', 'nonmutating', 'lazy',
];

const SWIFT_ATTRIBUTES = [
  '@State', '@Binding', '@Observable', '@Environment', '@EnvironmentObject',
  '@StateObject', '@ObservedObject', '@Published', '@main', '@discardableResult',
  '@MainActor', '@ViewBuilder', '@escaping', '@autoclosure',
];

const SWIFTUI_TYPES = [
  'View', 'Text', 'Button', 'NavigationStack', 'NavigationLink',
  'List', 'ForEach', 'ScrollView', 'VStack', 'HStack', 'ZStack',
  'Image', 'Label', 'TextField', 'SecureField', 'Toggle', 'Picker',
  'DatePicker', 'Slider', 'Stepper', 'Form', 'Section', 'Group',
  'Spacer', 'Divider', 'Sheet', 'Alert', 'TabView', 'TabItem',
  'GeometryReader', 'LazyVStack', 'LazyHStack', 'LazyVGrid', 'LazyHGrid',
  'Color', 'Font', 'Edge', 'Alignment', 'ContentMode', 'Animation',
  'String', 'Int', 'Double', 'Float', 'Bool', 'Date', 'UUID', 'URL',
  'Array', 'Dictionary', 'Set', 'Optional', 'Result', 'Never',
  'Identifiable', 'Codable', 'Equatable', 'Hashable', 'Comparable',
];

function registerSwiftLanguage(monaco: ReturnType<typeof useMonaco>) {
  if (!monaco) return;

  // Only register once
  const existing = monaco.languages.getLanguages().find(l => l.id === 'swift');
  if (existing) return;

  monaco.languages.register({ id: 'swift' });

  monaco.languages.setMonarchTokensProvider('swift', {
    keywords: SWIFT_KEYWORDS,
    typeKeywords: SWIFTUI_TYPES,
    attributes: SWIFT_ATTRIBUTES.map(a => a.slice(1)), // strip @

    tokenizer: {
      root: [
        // Attributes like @State
        [/@[A-Za-z]\w*/, 'keyword.control'],
        // #Preview #if #else etc
        [/#[A-Za-z]\w*/, 'keyword.control'],
        // Identifiers and keywords
        [/[A-Z]\w*/, {
          cases: {
            '@typeKeywords': 'type.identifier',
            '@default': 'identifier',
          },
        }],
        [/[a-z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        }],
        // Whitespace
        [/\s+/, 'white'],
        // Comments
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        // Strings
        [/"/, 'string', '@string'],
        // String interpolation
        [/"""/, 'string', '@multilineString'],
        // Numbers
        [/\d+\.\d+/, 'number.float'],
        [/\d+/, 'number'],
        // Operators
        [/[+\-*/<>=!&|?:.,;{}[\]()]/, 'delimiter'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/\\\(/, 'string', '@interpolation'],
        [/"/, 'string', '@pop'],
      ],
      multilineString: [
        [/[^"\\]+/, 'string'],
        [/\\./, 'string.escape'],
        [/\\\(/, 'string', '@interpolation'],
        [/"""/, 'string', '@pop'],
      ],
      interpolation: [
        [/\)/, 'string', '@pop'],
        { include: 'root' },
      ],
    },
  } as Parameters<typeof monaco.languages.setMonarchTokensProvider>[1]);

  // Custom theme with Rocketship orange accents
  monaco.editor.defineTheme('rocketship-swift', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'F97316', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: 'FB923C' },
      { token: 'type.identifier', foreground: '34D399' },
      { token: 'identifier', foreground: 'E5E5EA' },
      { token: 'string', foreground: 'FDBA74' },
      { token: 'string.escape', foreground: 'F97316' },
      { token: 'number', foreground: 'A78BFA' },
      { token: 'number.float', foreground: 'A78BFA' },
      { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '9CA3AF' },
    ],
    colors: {
      'editor.background': '#0F0F13',
      'editor.foreground': '#E5E5EA',
      'editorLineNumber.foreground': '#374151',
      'editorLineNumber.activeForeground': '#F97316',
      'editor.lineHighlightBackground': '#1A1A24',
      'editorCursor.foreground': '#F97316',
      'editor.selectionBackground': '#F9731640',
      'editorBracketMatch.background': '#F9731620',
      'editorBracketMatch.border': '#F97316',
    },
  });
}

// ─── File tree sidebar ────────────────────────────────────────────────────────

const ROLE_ICON: Record<SwiftFile['role'], string> = {
  app: '◆',
  model: '⬟',
  viewmodel: '⬡',
  view: '⬛',
  util: '◈',
};
const ROLE_COLOR: Record<SwiftFile['role'], string> = {
  app: '#F97316',
  model: '#34D399',
  viewmodel: '#60A5FA',
  view: '#A78BFA',
  util: '#9CA3AF',
};

function FileTree({
  files,
  activeFile,
  streamingFile,
  onSelect,
}: {
  files: SwiftFile[];
  activeFile: string | null;
  streamingFile: string | null;
  onSelect: (f: string) => void;
}) {
  const groups: Record<SwiftFile['role'], SwiftFile[]> = {
    app: [], model: [], viewmodel: [], view: [], util: [],
  };
  for (const f of files) groups[f.role].push(f);

  const groupLabels: [SwiftFile['role'], string][] = [
    ['app', 'App'],
    ['viewmodel', 'ViewModels'],
    ['model', 'Models'],
    ['view', 'Views'],
    ['util', 'Utilities'],
  ];

  return (
    <div style={{
      width: '180px', minWidth: '180px',
      background: '#0A0A0F',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      overflowY: 'auto',
      padding: '12px 0',
      flexShrink: 0,
    }}>
      <p style={{
        margin: '0 0 8px', padding: '0 14px',
        fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#4B5563',
      }}>
        Project
      </p>

      {groupLabels.map(([role, label]) => {
        const groupFiles = groups[role];
        if (groupFiles.length === 0) return null;
        return (
          <div key={role}>
            <p style={{
              margin: '8px 0 2px', padding: '0 14px',
              fontSize: '9px', fontWeight: '600',
              color: ROLE_COLOR[role],
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {label}
            </p>
            {groupFiles.map(f => {
              const isActive = f.filename === activeFile;
              const isStreaming = f.filename === streamingFile;
              return (
                <button
                  key={f.filename}
                  onClick={() => onSelect(f.filename)}
                  title={f.filename}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    width: '100%', textAlign: 'left', padding: '6px 14px',
                    background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '2px solid #F97316' : '2px solid transparent',
                    color: isActive ? '#F97316' : '#6B7280',
                    fontSize: '11px',
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    cursor: 'pointer',
                    wordBreak: 'break-all', lineHeight: '1.3',
                    transition: 'background 0.1s, color 0.1s, border-color 0.1s',
                  }}
                >
                  <span style={{ fontSize: '9px', color: ROLE_COLOR[role], flexShrink: 0 }}>
                    {ROLE_ICON[role]}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.filename}
                  </span>
                  {isStreaming && (
                    <span style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: '#F97316', flexShrink: 0,
                      boxShadow: '0 0 4px #F97316',
                      animation: 'streamPulse 0.8s ease-in-out infinite',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main editor component ────────────────────────────────────────────────────

export default function SwiftCodeEditor({ files, activeFile, streamingFile, onFileSelect, onFileChange }: Props) {
  const monaco = useMonaco();
  const editorRef = useRef<Parameters<NonNullable<Parameters<typeof Editor>[0]['onMount']>>[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [lineCol, setLineCol] = useState({ line: 1, col: 1 });

  const activeFileObj = files.find(f => f.filename === activeFile);

  // Register Swift language and theme once Monaco loads
  useEffect(() => {
    if (monaco) registerSwiftLanguage(monaco);
  }, [monaco]);

  // Update cursor position
  const handleEditorMount = useCallback(
    (editor: NonNullable<typeof editorRef.current>) => {
      editorRef.current = editor;
      editor.onDidChangeCursorPosition(e => {
        setLineCol({ line: e.position.lineNumber, col: e.position.column });
      });
    },
    []
  );

  const handleCopy = () => {
    if (activeFileObj?.content) {
      navigator.clipboard.writeText(activeFileObj.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isStreaming = activeFile === streamingFile;

  if (files.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0F0F13', color: '#374151', fontSize: '13px',
      }}>
        <div style={{ textAlign: 'center', gap: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          <span>Swift files will appear here</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes streamPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#0F0F13' }}>
        {/* File tree */}
        <FileTree
          files={files}
          activeFile={activeFile}
          streamingFile={streamingFile}
          onSelect={onFileSelect}
        />

        {/* Editor pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 16px',
            background: '#0A0A0F',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: '11px', color: '#4B5563' }}>
                {activeFileObj ? ROLE_ICON[activeFileObj.role] : ''}
              </span>
              <span style={{
                fontSize: '12px', fontWeight: '500',
                color: isStreaming ? '#F97316' : '#9CA3AF',
                fontFamily: '"JetBrains Mono", monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {activeFile ?? 'No file selected'}
              </span>
              {isStreaming && (
                <span style={{ fontSize: '10px', color: '#F97316', fontWeight: '600', flexShrink: 0 }}>
                  ● writing…
                </span>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={!activeFileObj}
              style={{
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                fontSize: '11px', fontWeight: '500',
                color: copied ? '#34D399' : '#6B7280',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'color 0.15s',
                flexShrink: 0,
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Monaco editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language="swift"
              theme="rocketship-swift"
              value={activeFileObj?.content ?? ''}
              onChange={(value) => {
                if (activeFile && value !== undefined) {
                  onFileChange(activeFile, value);
                }
              }}
              onMount={handleEditorMount}
              options={{
                fontSize: 13,
                fontFamily: '"JetBrains Mono", "Fira Code", Menlo, monospace',
                fontLigatures: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                bracketPairColorization: { enabled: true },
                renderLineHighlight: 'line',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                padding: { top: 16, bottom: 16 },
                // Disable read-only while streaming to allow live content updates
                readOnly: false,
                quickSuggestions: false,  // disabled — no LSP in browser
              }}
            />
          </div>

          {/* Xcode-style status bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '4px 16px',
            background: '#0A0A0F',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '10px', color: '#4B5563',
            flexShrink: 0,
          }}>
            <span>Ln {lineCol.line}, Col {lineCol.col}</span>
            <span style={{ color: '#374151' }}>·</span>
            <span style={{ color: '#F97316' }}>Swift 5.9</span>
            <span style={{ color: '#374151' }}>·</span>
            <span>iOS 17.0+</span>
            {activeFileObj && (
              <>
                <span style={{ color: '#374151' }}>·</span>
                <span style={{ color: ROLE_COLOR[activeFileObj.role] }}>
                  {activeFileObj.role.charAt(0).toUpperCase() + activeFileObj.role.slice(1)}
                </span>
              </>
            )}
            <span style={{ marginLeft: 'auto', color: '#374151' }}>
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
