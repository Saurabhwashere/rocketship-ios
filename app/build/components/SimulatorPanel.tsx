'use client';

import { useEffect, useRef } from 'react';
import JSZip from 'jszip';
import type { SwiftProject } from '../page';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  project: SwiftProject | null;
  isBuilding: boolean;
  buildLogs: string[];
  isDeploying: boolean;
  deployLogs: string[];
};

// ─── Download helper ──────────────────────────────────────────────────────────

async function downloadSwiftProject(project: SwiftProject) {
  const zip = new JSZip();
  const appName = project.appName.replace(/\s+/g, '');

  for (const f of project.files) {
    zip.folder(appName)?.file(f.filename, f.content);
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── iPhone 15 Pro SVG Frame ─────────────────────────────────────────────────

function IPhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '260px',
        flexShrink: 0,
        // Titanium-style housing
        background: 'linear-gradient(160deg, #3A3A3C 0%, #1C1C1E 40%, #2C2C2E 100%)',
        borderRadius: '44px',
        padding: '14px',
        boxShadow: [
          '0 0 0 1px rgba(255,255,255,0.15)',   // inner rim highlight
          '0 4px 6px rgba(0,0,0,0.4)',
          '0 20px 60px rgba(0,0,0,0.65)',
          'inset 0 1px 1px rgba(255,255,255,0.1)',
        ].join(', '),
      }}
    >
      {/* Side buttons — volume up */}
      <div style={{
        position: 'absolute', left: '-4px', top: '100px',
        width: '4px', height: '32px',
        background: 'linear-gradient(to right, #2C2C2E, #3A3A3C)',
        borderRadius: '2px 0 0 2px',
        boxShadow: '-1px 0 2px rgba(0,0,0,0.4)',
      }} />
      {/* Side buttons — volume down */}
      <div style={{
        position: 'absolute', left: '-4px', top: '144px',
        width: '4px', height: '32px',
        background: 'linear-gradient(to right, #2C2C2E, #3A3A3C)',
        borderRadius: '2px 0 0 2px',
        boxShadow: '-1px 0 2px rgba(0,0,0,0.4)',
      }} />
      {/* Side button — mute switch */}
      <div style={{
        position: 'absolute', left: '-4px', top: '72px',
        width: '4px', height: '22px',
        background: 'linear-gradient(to right, #2C2C2E, #3A3A3C)',
        borderRadius: '2px 0 0 2px',
        boxShadow: '-1px 0 2px rgba(0,0,0,0.4)',
      }} />
      {/* Side button — power */}
      <div style={{
        position: 'absolute', right: '-4px', top: '110px',
        width: '4px', height: '48px',
        background: 'linear-gradient(to left, #2C2C2E, #3A3A3C)',
        borderRadius: '0 2px 2px 0',
        boxShadow: '1px 0 2px rgba(0,0,0,0.4)',
      }} />

      {/* Screen bezel */}
      <div
        style={{
          background: '#000',
          borderRadius: '34px',
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: '390 / 844',
        }}
      >
        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '44px', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 0',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff', letterSpacing: '-0.2px' }}>9:41</span>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {/* Signal */}
            <svg width="16" height="11" viewBox="0 0 16 11" fill="white">
              <rect x="0" y="7" width="2.5" height="4" rx="0.5"/>
              <rect x="3.5" y="5" width="2.5" height="6" rx="0.5"/>
              <rect x="7" y="3" width="2.5" height="8" rx="0.5"/>
              <rect x="10.5" y="0" width="2.5" height="11" rx="0.5"/>
            </svg>
            {/* WiFi */}
            <svg width="14" height="11" viewBox="0 0 14 11" fill="white">
              <path d="M7 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
              <path d="M2.5 6C4 4.2 5.9 3 7 3s3 1.2 4.5 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M0 3.5C2.2 1.2 4.5 0 7 0s4.8 1.2 7 3.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
            {/* Battery */}
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
              <rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="white" strokeOpacity="0.4"/>
              <rect x="2" y="2" width="15" height="8" rx="1.5" fill="white"/>
              <path d="M22 4.5v3a1.5 1.5 0 000-3z" fill="white" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>

        {/* Dynamic Island */}
        <div style={{
          position: 'absolute', top: '10px', left: '50%',
          transform: 'translateX(-50%)',
          width: '120px', height: '34px',
          background: '#000',
          borderRadius: '20px',
          zIndex: 20,
          boxShadow: '0 0 0 2px #1C1C1E',
        }} />

        {/* Screen content */}
        <div style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Build log feed ───────────────────────────────────────────────────────────

function BuildLog({ logs }: { logs: string[] }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  return (
    <div
      ref={logRef}
      style={{
        width: '100%', height: '100%',
        background: '#0D1117',
        overflowY: 'auto',
        padding: '48px 14px 14px',
        fontFamily: 'var(--font-geist-mono, "JetBrains Mono", monospace)',
        fontSize: '9px',
        lineHeight: '1.6',
        color: '#7CFC00',
      }}
    >
      {logs.length === 0 ? (
        <span style={{ color: '#555' }}>Waiting for build output…</span>
      ) : (
        logs.map((line, i) => (
          <div key={i} style={{ marginBottom: '1px', wordBreak: 'break-all' }}>
            <span style={{ color: '#555', marginRight: '6px' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ color: line.startsWith('Error') ? '#FF5F57' : '#7CFC00' }}>{line}</span>
          </div>
        ))
      )}
      {/* Blinking cursor */}
      <span style={{ display: 'inline-block', width: '6px', height: '10px', background: '#7CFC00', animation: 'blink 1s step-end infinite', verticalAlign: 'middle', marginLeft: '2px' }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SimulatorPanel({ project, isBuilding, buildLogs, isDeploying, deployLogs }: Props) {
  const hasApp  = !!project?.previewUrl;   // Appetize binary ready
  const hasCode = !!project && !isBuilding; // Swift code generated

  // Determine which screen to show inside the iPhone
  const screenContent = (() => {
    // STATE D — Appetize binary ready
    if (hasApp && !isDeploying) {
      return (
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(180deg, #0A0A10 0%, #111120 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '14px', padding: '44px 20px 20px',
        }}>
          {/* App icon placeholder */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #F97316, #EA580C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(249,115,22,0.4)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2a3 3 0 00-3-3z"/>
              <path d="M12 2s4.8 2.4 6 7c1 4-2 8-6 10C8 17 5 13 6 9c1.2-4.6 6-7 6-7z"/>
              <circle cx="12" cy="10" r="2"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#F5F5F5', letterSpacing: '-0.3px' }}>
              {project!.appName}
            </div>
            <div style={{ fontSize: '9px', color: '#555', marginTop: '3px' }}>
              Ready on Appetize.io
            </div>
          </div>
          {/* Launch button */}
          <a
            href={project!.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              borderRadius: '10px', fontSize: '12px', fontWeight: '700',
              color: '#fff', textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
            }}
          >
            Launch Simulator
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <p style={{ fontSize: '8px', color: '#3A3A3A', textAlign: 'center', margin: 0, lineHeight: '1.5' }}>
            Opens Appetize.io in a new tab<br/>iPhone 15 Pro · iOS 17
          </p>
        </div>
      );
    }

    // STATE D_BUILD — GitHub Actions build running
    if (isDeploying) {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <BuildLog logs={deployLogs} />
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            padding: '3px 10px',
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: '20px', fontSize: '8px', fontWeight: '600',
            color: '#F97316', whiteSpace: 'nowrap',
          }}>
            xcodebuild running on GitHub Actions
          </div>
        </div>
      );
    }

    if (hasCode && !isBuilding) {
      // STATE C — Code generated, ready to download and open in Xcode
      const viewFiles = project.files.filter(f => f.role === 'view');
      const modelFiles = project.files.filter(f => f.role === 'model');

      return (
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(180deg, #0F0F13 0%, #1A1A22 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '12px', padding: '44px 20px 20px',
        }}>
          {/* Success checkmark */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(52,211,153,0.12)',
            border: '1.5px solid rgba(52,211,153,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          {/* App name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#F5F5F5', letterSpacing: '-0.3px' }}>
              {project.appName}
            </div>
            <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
              iOS {project.deploymentTarget} · Swift 5.9
            </div>
          </div>

          {/* File stats */}
          <div style={{
            display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {[
              { label: 'screens', count: viewFiles.length, color: '#F97316' },
              { label: 'models', count: modelFiles.length, color: '#A78BFA' },
              { label: 'total files', count: project.files.length, color: '#34D399' },
            ].filter(s => s.count > 0).map(stat => (
              <div key={stat.label} style={{
                padding: '3px 8px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${stat.color}33`,
                borderRadius: '6px',
                fontSize: '9px', color: stat.color,
                fontWeight: '600',
              }}>
                {stat.count} {stat.label}
              </div>
            ))}
          </div>

          {/* Download CTA */}
          <button
            onClick={() => downloadSwiftProject(project)}
            style={{
              marginTop: '4px',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              border: 'none',
              borderRadius: '10px', fontSize: '11px', fontWeight: '700',
              color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Open in Xcode
          </button>

          <p style={{ fontSize: '8px', color: '#444', textAlign: 'center', margin: 0, lineHeight: '1.5' }}>
            Download zip · open .xcodeproj<br />run on simulator or device
          </p>
        </div>
      );
    }

    if (isBuilding) {
      // STATE B — Building
      return <BuildLog logs={buildLogs} />;
    }

    // STATE A — Idle
    return (
      <div style={{
        width: '100%', height: '100%',
        background: '#0F0F13',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '10px', padding: '40px',
      }}>
        {/* Rocket icon */}
        <div style={{ animation: 'float 3s ease-in-out infinite' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2a3 3 0 00-3-3z"/>
            <path d="M12 2s4.8 2.4 6 7c1 4-2 8-6 10C8 17 5 13 6 9c1.2-4.6 6-7 6-7z"/>
            <circle cx="12" cy="10" r="2"/>
          </svg>
        </div>
        <p style={{ fontSize: '10px', color: '#555', textAlign: 'center', margin: 0, lineHeight: '1.5' }}>
          Your iOS app<br />will appear here
        </p>
      </div>
    );
  })();

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes buildPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '20px',
        padding: '24px 16px',
        height: '100%', overflowY: 'auto',
        background: 'radial-gradient(ellipse at top, rgba(249,115,22,0.06) 0%, transparent 60%), #0F0F13',
      }}>

        {/* Header badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '4px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          fontSize: '11px', fontWeight: '600',
          color: hasApp ? '#34D399' : isDeploying ? '#A78BFA' : hasCode ? '#34D399' : isBuilding ? '#F97316' : '#555',
          letterSpacing: '0.04em',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: hasApp ? '#34D399' : isDeploying ? '#A78BFA' : hasCode ? '#34D399' : isBuilding ? '#F97316' : '#444',
            boxShadow: hasApp ? '0 0 6px #34D399' : isDeploying ? '0 0 6px #A78BFA' : hasCode ? '0 0 6px #34D399' : isBuilding ? '0 0 6px #F97316' : 'none',
            animation: (isBuilding || isDeploying) ? 'buildPulse 1s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }} />
          {hasApp ? 'Simulator Ready' : isDeploying ? 'Compiling…' : hasCode ? 'Code Ready' : isBuilding ? 'Generating…' : 'iOS Simulator'}
        </div>

        {/* iPhone frame */}
        <IPhoneFrame>
          {screenContent}
        </IPhoneFrame>

        {/* Action buttons below the phone */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {hasApp && !isDeploying && (
            <a
              href={project!.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px',
                background: 'rgba(249,115,22,0.12)',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                color: '#F97316', textDecoration: 'none',
              }}
            >
              Open Appetize ↗
            </a>
          )}
          {hasCode && !isBuilding && (
            <button
              onClick={() => downloadSwiftProject(project)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                color: '#AAA', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download .xcodeproj.zip
            </button>
          )}
        </div>
      </div>
    </>
  );
}
