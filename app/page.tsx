'use client';

import Link from 'next/link';

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* Swift bird silhouette */}
        <path d="M12 2C6.5 2 3 6 3 10c0 2.5 1.2 4.7 3 6.2L4 20l4-1.5c1.2.5 2.6.8 4 .8 5.5 0 9-4 9-8s-3.5-9.3-9-9.3z"/>
        <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
      </svg>
    ),
    title: 'Real Swift Code',
    desc: 'Generates actual SwiftUI files you can open directly in Xcode. No wrappers, no transpilation — pure native iOS code.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
        <line x1="9" y1="5" x2="15" y2="5" />
      </svg>
    ),
    title: 'Live iOS Simulator',
    desc: 'See your app running in a real iOS simulator, streamed to your browser via Appetize. Touch, scroll, interact in real time.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
    title: 'Export to Xcode',
    desc: 'Download your complete Xcode project at any time and keep building. Your code, fully yours.',
  },
];

const steps = [
  { num: '01', label: 'Describe',  detail: 'Tell Rocketship what your iOS app should do' },
  { num: '02', label: 'Generate',  detail: 'Claude AI writes SwiftUI code across multiple files' },
  { num: '03', label: 'Preview',   detail: 'Your app runs in a live iOS simulator in the browser' },
  { num: '04', label: 'Download',  detail: 'Export your Xcode project and keep building' },
];

// Simulated Swift file content for the hero code preview
const HERO_CODE = `import SwiftUI

@Observable
class HabitStore {
    var habits: [Habit] = Habit.sampleData
}

struct ContentView: View {
    @State private var store = HabitStore()

    var body: some View {
        NavigationStack {
            List(store.habits) { habit in
                HabitRow(habit: habit)
            }
            .navigationTitle("Habits")
        }
    }
}

#Preview {
    ContentView()
}`;

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F0F13',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflowX: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '900px', height: '600px',
        background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ━━━ NAVBAR ━━━ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: '60px',
        background: 'rgba(15,15,19,0.88)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/rocket.png" alt="Rocketship" style={{ width: '22px', height: '22px' }} />
          <span style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.3px' }}>Rocketship</span>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#F97316', boxShadow: '0 0 8px #F97316', display: 'inline-block', flexShrink: 0,
          }} />
        </div>
        <Link href="/build" style={{
          padding: '8px 20px', background: '#F97316', color: '#fff',
          borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none',
          boxShadow: '0 0 18px rgba(249,115,22,0.35)', letterSpacing: '-0.1px',
        }}>
          Start building
        </Link>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '100px 24px 80px', gap: '32px',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px',
          background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: '100px', fontSize: '12px', fontWeight: '600',
          color: '#F97316', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F97316', boxShadow: '0 0 8px #F97316', display: 'inline-block' }} />
          Swift + Claude AI · Appetize Simulator
        </div>

        {/* Headline */}
        <h1 style={{
          margin: 0, fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: '800',
          lineHeight: '1.08', letterSpacing: '-2px', maxWidth: '820px',
        }}>
          Build{' '}
          <span style={{
            background: 'linear-gradient(135deg, #F97316 0%, #FB923C 50%, #FDBA74 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            native iOS Swift
          </span>{' '}
          apps
          <br />without writing code
        </h1>

        {/* Sub-headline */}
        <p style={{
          margin: 0, fontSize: 'clamp(16px, 2vw, 20px)', color: '#9999AA',
          lineHeight: '1.7', maxWidth: '540px',
        }}>
          Describe your app idea. Rocketship generates real SwiftUI code,
          compiles it in the cloud, and runs it in a live iOS simulator — all in your browser.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/build" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 32px', background: '#F97316', color: '#fff',
            borderRadius: '10px', fontSize: '16px', fontWeight: '700', textDecoration: 'none',
            boxShadow: '0 0 40px rgba(249,115,22,0.45)', letterSpacing: '-0.2px',
          }}>
            Try now — it&apos;s free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <a href="#how-it-works" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '14px 28px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#CCCCCC',
            borderRadius: '10px', fontSize: '15px', fontWeight: '500', textDecoration: 'none',
          }}>
            See how it works
          </a>
        </div>

        {/* Hero mockup — split: code editor + iPhone */}
        <div style={{ marginTop: '16px', position: 'relative', width: '100%', maxWidth: '960px' }}>
          <div aria-hidden style={{
            position: 'absolute', inset: '-40px',
            background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.1) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'relative', background: '#1A1A24',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
            overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}>
            {/* Browser chrome */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#13131A',
            }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28C840', display: 'inline-block' }} />
              <div style={{
                flex: 1, marginLeft: '8px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px',
                padding: '4px 12px', fontSize: '11px', color: '#6A6A7A', textAlign: 'center',
              }}>
                rocketship.app/build
              </div>
            </div>

            {/* Content split */}
            <div style={{ display: 'flex', height: '380px' }}>
              {/* Left: chat panel */}
              <div style={{
                width: '22%', borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', padding: '16px 14px', gap: '10px',
              }}>
                <span style={{ fontSize: '10px', fontWeight: '600', color: '#444' }}>Chat</span>
                {[
                  { user: true,  text: 'Habit tracker app' },
                  { user: false, text: 'Great! What streak display?' },
                  { user: true,  text: 'Show a ring chart' },
                  { user: false, text: 'Architecting SwiftUI views…' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: b.user ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '6px 9px',
                      borderRadius: b.user ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                      background: b.user ? '#F97316' : 'rgba(255,255,255,0.05)',
                      border: b.user ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      fontSize: '10px', color: b.user ? '#fff' : '#9999AA',
                      maxWidth: '90%', lineHeight: '1.4',
                    }}>
                      {b.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Middle: code editor */}
              <div style={{
                flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)',
                background: '#0F0F13', padding: 0, overflow: 'hidden',
              }}>
                {/* File tab */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: '#0A0A0F',
                }}>
                  {['HabitStore.swift', 'ContentView.swift'].map((f, i) => (
                    <div key={f} style={{
                      padding: '7px 14px', fontSize: '10px', fontFamily: 'monospace',
                      color: i === 1 ? '#F97316' : '#444',
                      borderBottom: i === 1 ? '1px solid #F97316' : '1px solid transparent',
                      borderRight: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      {f}
                    </div>
                  ))}
                </div>
                {/* Code */}
                <pre style={{
                  margin: 0, padding: '14px 16px',
                  fontSize: '10px', fontFamily: '"JetBrains Mono", monospace',
                  lineHeight: '1.65', color: '#9CA3AF',
                  overflowY: 'auto', height: 'calc(100% - 32px)',
                }}>
                  {HERO_CODE.split('\n').map((line, i) => {
                    const colored = line
                      .replace(/(import|struct|class|var|let|body|some|func|return)\b/g, '<kw>$1</kw>')
                      .replace(/(@Observable|@State|@Environment|NavigationStack|List|ContentView|HabitStore|HabitRow)\b/g, '<type>$1</type>')
                      .replace(/(\/\/.*$)/g, '<comment>$1</comment>')
                      .replace(/"([^"]*)"/g, '<str>"$1"</str>');
                    return (
                      <div key={i} style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: '#2D3748', userSelect: 'none', minWidth: '16px', textAlign: 'right' }}>{i + 1}</span>
                        <span dangerouslySetInnerHTML={{ __html: colored
                          .replace(/<kw>/g, '<span style="color:#F97316;font-weight:600">')
                          .replace(/<\/kw>/g, '</span>')
                          .replace(/<type>/g, '<span style="color:#34D399">')
                          .replace(/<\/type>/g, '</span>')
                          .replace(/<comment>/g, '<span style="color:#4B5563;font-style:italic">')
                          .replace(/<\/comment>/g, '</span>')
                          .replace(/<str>/g, '<span style="color:#FDBA74">')
                          .replace(/<\/str>/g, '</span>')
                        }} />
                      </div>
                    );
                  })}
                </pre>
              </div>

              {/* Right: iPhone 15 Pro mockup */}
              <div style={{
                width: '28%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.04) 0%, transparent 70%)',
                padding: '16px',
              }}>
                <div style={{
                  width: '130px',
                  background: 'linear-gradient(160deg, #3A3A3C, #1C1C1E)',
                  borderRadius: '32px',
                  padding: '10px',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 20px 50px rgba(0,0,0,0.7)',
                }}>
                  <div style={{ background: '#000', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
                    {/* Dynamic Island */}
                    <div style={{
                      position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
                      width: '60px', height: '18px', background: '#000',
                      borderRadius: '12px', zIndex: 10, boxShadow: '0 0 0 1.5px #1C1C1E',
                    }} />
                    {/* Status bar */}
                    <div style={{ padding: '10px 10px 4px', display: 'flex', justifyContent: 'space-between', paddingTop: '30px' }}>
                      <span style={{ fontSize: '7px', fontWeight: '700', color: '#fff' }}>9:41</span>
                      <span style={{ fontSize: '7px', color: '#fff' }}>●●●</span>
                    </div>
                    {/* App content */}
                    <div style={{ padding: '0 8px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Habits</div>
                      {['Morning Run', 'Meditation', 'Read 30 min', 'Drink Water'].map((h, i) => (
                        <div key={h} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '5px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}>
                          <div style={{
                            width: '16px', height: '16px', borderRadius: '50%',
                            background: i < 2 ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)',
                            border: i < 2 ? '1.5px solid #F97316' : '1.5px solid #333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {i < 2 && <span style={{ fontSize: '8px', color: '#F97316' }}>✓</span>}
                          </div>
                          <span style={{ fontSize: '8px', color: i < 2 ? '#fff' : '#666' }}>{h}</span>
                          <div style={{
                            marginLeft: 'auto', fontSize: '7px',
                            color: i < 2 ? '#F97316' : '#333',
                            fontWeight: '600',
                          }}>
                            {['7d', '14d', '–', '–'][i]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', letterSpacing: '-1px' }}>
            Everything you need to ship
          </h2>
          <p style={{ margin: 0, fontSize: '16px', color: '#9999AA', lineHeight: '1.7' }}>
            No Xcode. No Swift knowledge. No experience needed.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {features.map(f => (
            <div key={f.title} style={{
              padding: '28px', background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316',
              }}>
                {f.icon}
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', letterSpacing: '-0.3px' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#9999AA', lineHeight: '1.65' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section id="how-it-works" style={{ position: 'relative', zIndex: 1, padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', letterSpacing: '-1px' }}>
            How it works
          </h2>
          <p style={{ margin: 0, fontSize: '16px', color: '#9999AA' }}>From idea to live iOS app in under a minute.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {steps.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '44px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700', color: '#F97316', flexShrink: 0,
                }}>
                  {s.num}
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: '1px', flex: '1', minHeight: '40px',
                    background: 'linear-gradient(to bottom, rgba(249,115,22,0.3), rgba(249,115,22,0.05))',
                    margin: '8px 0',
                  }} />
                )}
              </div>
              <div style={{ paddingTop: '10px', paddingBottom: i < steps.length - 1 ? '32px' : '0' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px' }}>{s.label}</h3>
                <p style={{ margin: 0, fontSize: '15px', color: '#9999AA', lineHeight: '1.65' }}>{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section style={{
        position: 'relative', zIndex: 1, padding: '80px 24px 120px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '28px',
      }}>
        <div aria-hidden style={{
          position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h2 style={{
          margin: 0, fontSize: 'clamp(30px, 5vw, 56px)', fontWeight: '800',
          letterSpacing: '-1.5px', lineHeight: '1.1', maxWidth: '620px',
        }}>
          Ready to build your first iOS app?
        </h2>
        <p style={{ margin: 0, fontSize: '17px', color: '#9999AA', maxWidth: '420px', lineHeight: '1.65' }}>
          No sign-up required. Describe your app idea and watch real SwiftUI code come to life.
        </p>
        <Link href="/build" style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '16px 40px', background: '#F97316', color: '#fff',
          borderRadius: '12px', fontSize: '17px', fontWeight: '700', textDecoration: 'none',
          boxShadow: '0 0 50px rgba(249,115,22,0.5)', letterSpacing: '-0.2px',
        }}>
          Try now — it&apos;s free
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <img src="/rocket.png" alt="Rocketship" style={{ width: '16px', height: '16px', opacity: 0.6 }} />
          <span style={{ fontSize: '13px', color: '#555566', fontWeight: '500' }}>Rocketship</span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#44445A' }}>
          Powered by Claude AI · Appetize iOS Simulator · Built with Next.js
        </p>
      </footer>
    </div>
  );
}
