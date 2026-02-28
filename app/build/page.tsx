'use client';

import { useReducer, useRef, useEffect, useCallback } from 'react';
import SimulatorPanel from './components/SimulatorPanel';
import SwiftCodeEditor from './components/SwiftCodeEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SwiftFile = {
  filename: string;
  content: string;
  role: 'view' | 'model' | 'viewmodel' | 'app' | 'util';
};

export type SwiftProject = {
  appName: string;
  bundleId: string;
  deploymentTarget: string;
  files: SwiftFile[];
  entryPoint: string;
  previewUrl?: string;
  appetizePublicKey?: string;
};

export type BuildBlueprint = {
  appName: string;
  bundleId: string;
  deploymentTarget: string;
  navigationStyle: 'tab' | 'stack' | 'split';
  screens: { name: string; purpose: string; swiftUIViews: string[] }[];
  dataModels: { name: string; properties: { name: string; type: string }[] }[];
  estimatedFiles: number;
};

type AgentName = 'clarifier' | 'architect' | 'coder' | 'reviewer' | 'deployer';
type AgentStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

type AgentStep = {
  agent: AgentName;
  status: AgentStatus;
  detail: string;
  filesGenerated?: string[];
};

type ClarificationQuestion = { id: string; text: string };

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  project?: SwiftProject;
  blueprint?: BuildBlueprint;
  agentSteps?: AgentStep[];
  questionMeta?: { index: number; total: number };
  isLoading?: boolean;
  isAnswer?: boolean;
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

type AppState = {
  phase: 'idle' | 'clarifying' | 'building' | 'done' | 'error';
  messages: Message[];
  currentProject: SwiftProject | null;
  activeFile: string | null;
  streamingFile: string | null;   // file currently being AI-written
  buildLogs: string[];
  isBuilding: boolean;
  isDeploying: boolean;           // GitHub Actions build running
  deployLogs: string[];
  error: string;
  // Clarification session
  clarifyState: {
    originalPrompt: string;
    questions: ClarificationQuestion[];
    answers: Record<string, string>;
    currentIndex: number;
  } | null;
  qaHistory: { question: string; answer: string }[];
};

type Action =
  | { type: 'CLARIFY_LOADING'; payload: { userMsg: Message; loadingMsg: Message } }
  | { type: 'CLARIFY_QUESTIONS'; payload: { loadingId: string; questions: ClarificationQuestion[]; originalPrompt: string } }
  | { type: 'CLARIFY_ANSWER'; payload: { text: string; nextQuestion?: ClarificationQuestion & { index: number; total: number } } }
  | { type: 'CLARIFY_DONE'; payload: { pairs: { question: string; answer: string }[] } }
  | { type: 'BUILD_START'; payload: { pipelineMsg: Message } }
  | { type: 'AGENT_UPDATE'; payload: { pipelineId: string; step: AgentStep; blueprint?: BuildBlueprint } }
  | { type: 'FILE_START'; payload: { filename: string } }
  | { type: 'FILE_CHUNK'; payload: { filename: string; chunk: string } }
  | { type: 'FILE_DONE'; payload: SwiftFile }
  | { type: 'BUILD_LOG'; payload: string }
  | { type: 'BUILD_COMPLETE'; payload: { pipelineId: string; project: SwiftProject } }
  | { type: 'BUILD_ERROR'; payload: { pipelineId: string; message: string } }
  | { type: 'SELECT_FILE'; payload: string }
  | { type: 'FILE_EDITED'; payload: { filename: string; content: string } }
  | { type: 'RESTORE_PROJECT'; payload: SwiftProject }
  | { type: 'SKIP_CLARIFY' }
  | { type: 'CLEAR_LOADING'; payload: string }
  | { type: 'BUILD_DONE_FLAG' }
  | { type: 'DEPLOY_START' }
  | { type: 'DEPLOY_LOG'; payload: string }
  | { type: 'DEPLOY_COMPLETE'; payload: { previewUrl: string; publicKey: string } }
  | { type: 'DEPLOY_SKIP' }
  | { type: 'DEPLOY_ERROR' };

const INITIAL_STEPS: AgentStep[] = [
  { agent: 'clarifier', status: 'pending', detail: '' },
  { agent: 'architect', status: 'pending', detail: '' },
  { agent: 'coder',     status: 'pending', detail: '' },
  { agent: 'reviewer',  status: 'pending', detail: '' },
  { agent: 'deployer',  status: 'pending', detail: '' },
];

const INITIAL_STATE: AppState = {
  phase: 'idle',
  messages: [],
  currentProject: null,
  activeFile: null,
  streamingFile: null,
  buildLogs: [],
  isBuilding: false,
  isDeploying: false,
  deployLogs: [],
  error: '',
  clarifyState: null,
  qaHistory: [],
};

function updatePipelineSteps(
  messages: Message[],
  pipelineId: string,
  step: AgentStep,
  extras: Partial<Message> = {}
): Message[] {
  return messages.map(m => {
    if (m.id !== pipelineId) return m;
    const newSteps = (m.agentSteps ?? INITIAL_STEPS).map(s =>
      s.agent === step.agent ? { ...s, ...step } : s
    );
    return { ...m, agentSteps: newSteps, ...extras };
  });
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CLARIFY_LOADING':
      return {
        ...state,
        phase: 'clarifying',
        messages: [...state.messages, action.payload.userMsg, action.payload.loadingMsg],
      };

    case 'CLARIFY_QUESTIONS': {
      const { loadingId, questions, originalPrompt } = action.payload;
      const first = questions[0];
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === loadingId
            ? { ...m, isLoading: false, content: first.text, questionMeta: { index: 0, total: questions.length } }
            : m
        ),
        clarifyState: { originalPrompt, questions, answers: {}, currentIndex: 0 },
      };
    }

    case 'CLARIFY_ANSWER': {
      if (!state.clarifyState) return state;
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: action.payload.text,
        isAnswer: true,
      };
      const messages = [...state.messages, userMsg];
      if (action.payload.nextQuestion) {
        const nq = action.payload.nextQuestion;
        return {
          ...state,
          messages: [...messages, {
            id: `q-${Date.now()}`,
            role: 'assistant',
            content: nq.text,
            questionMeta: { index: nq.index, total: nq.total },
          }],
        };
      }
      return { ...state, messages };
    }

    case 'CLARIFY_DONE':
      return {
        ...state,
        clarifyState: null,
        qaHistory: [...state.qaHistory, ...action.payload.pairs],
      };

    case 'BUILD_START':
      return {
        ...state,
        phase: 'building',
        isBuilding: true,
        error: '',
        buildLogs: [],
        messages: [...state.messages, action.payload.pipelineMsg],
      };

    case 'AGENT_UPDATE':
      return {
        ...state,
        messages: updatePipelineSteps(
          state.messages,
          action.payload.pipelineId,
          action.payload.step,
          action.payload.blueprint ? { blueprint: action.payload.blueprint } : {}
        ),
      };

    case 'FILE_START':
      return {
        ...state,
        streamingFile: action.payload.filename,
        activeFile: state.activeFile ?? action.payload.filename,
      };

    case 'FILE_CHUNK': {
      if (!state.currentProject) {
        // Create project stub with this first file chunk
        const newFile: SwiftFile = {
          filename: action.payload.filename,
          content: action.payload.chunk,
          role: 'app',
        };
        return {
          ...state,
          currentProject: {
            appName: '', bundleId: '', deploymentTarget: '17.0',
            files: [newFile], entryPoint: action.payload.filename,
          },
        };
      }
      // Append chunk to existing streaming file
      const existing = state.currentProject.files.find(f => f.filename === action.payload.filename);
      const updatedFiles = existing
        ? state.currentProject.files.map(f =>
            f.filename === action.payload.filename
              ? { ...f, content: f.content + action.payload.chunk }
              : f
          )
        : [...state.currentProject.files, {
            filename: action.payload.filename,
            content: action.payload.chunk,
            role: 'util' as const,
          }];
      return {
        ...state,
        currentProject: { ...state.currentProject, files: updatedFiles },
      };
    }

    case 'FILE_DONE': {
      if (!state.currentProject) return state;
      const exists = state.currentProject.files.some(f => f.filename === action.payload.filename);
      const updatedFiles = exists
        ? state.currentProject.files.map(f =>
            f.filename === action.payload.filename ? action.payload : f
          )
        : [...state.currentProject.files, action.payload];
      return {
        ...state,
        currentProject: { ...state.currentProject, files: updatedFiles },
        activeFile: state.activeFile ?? action.payload.filename,
        streamingFile: null,
      };
    }

    case 'BUILD_LOG':
      return { ...state, buildLogs: [...state.buildLogs, action.payload] };

    case 'BUILD_COMPLETE':
      return {
        ...state,
        phase: 'done',
        isBuilding: false,
        streamingFile: null,
        currentProject: action.payload.project,
        activeFile: action.payload.project.entryPoint ?? action.payload.project.files[0]?.filename ?? null,
        messages: state.messages.map(m =>
          m.id === action.payload.pipelineId ? { ...m, project: action.payload.project } : m
        ),
      };

    case 'BUILD_ERROR':
      return {
        ...state,
        phase: 'error',
        isBuilding: false,
        streamingFile: null,
        error: action.payload.message,
        messages: updatePipelineSteps(state.messages, action.payload.pipelineId, {
          agent: 'coder', status: 'error', detail: action.payload.message,
        }),
      };

    case 'SELECT_FILE':
      return { ...state, activeFile: action.payload };

    case 'FILE_EDITED': {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          files: state.currentProject.files.map(f =>
            f.filename === action.payload.filename ? { ...f, content: action.payload.content } : f
          ),
        },
      };
    }

    case 'RESTORE_PROJECT':
      return {
        ...state,
        currentProject: action.payload,
        activeFile: action.payload.entryPoint ?? action.payload.files[0]?.filename ?? null,
      };

    case 'SKIP_CLARIFY':
      return { ...state, clarifyState: null };

    case 'CLEAR_LOADING':
      return { ...state, messages: state.messages.filter(m => m.id !== action.payload) };

    case 'BUILD_DONE_FLAG':
      return { ...state, isBuilding: false };

    case 'DEPLOY_START':
      return { ...state, isDeploying: true, deployLogs: [] };

    case 'DEPLOY_LOG':
      return { ...state, deployLogs: [...state.deployLogs, action.payload] };

    case 'DEPLOY_COMPLETE':
      return {
        ...state,
        isDeploying: false,
        currentProject: state.currentProject
          ? { ...state.currentProject, previewUrl: action.payload.previewUrl, appetizePublicKey: action.payload.publicKey }
          : state.currentProject,
      };

    case 'DEPLOY_SKIP':
    case 'DEPLOY_ERROR':
      return { ...state, isDeploying: false };

    default:
      return state;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID_KEY = 'rocketship_project_id';

const EXAMPLE_PROMPTS = [
  'Notes app', 'Habit tracker', 'Recipe manager', 'Workout logger', 'Budget tracker',
];

const AGENT_DEFS: { agent: AgentName; label: string }[] = [
  { agent: 'clarifier', label: 'Clarifier' },
  { agent: 'architect', label: 'Architect' },
  { agent: 'coder',     label: 'Coder'     },
  { agent: 'reviewer',  label: 'Reviewer'  },
  { agent: 'deployer',  label: 'Deployer'  },
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg: '#0F0F13',
  surface: '#1A1A24',
  border: 'rgba(255,255,255,0.07)',
  orange: '#F97316',
  text: '#E5E5EA',
  muted: '#6B7280',
  radius: '10px',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEnrichedPrompt(
  original: string,
  questions: ClarificationQuestion[],
  answers: Record<string, string>
): string {
  const answered = questions.filter(q => answers[q.id]);
  if (answered.length === 0) return original;
  const lines = answered.map(q => `- ${q.text}: ${answers[q.id]}`).join('\n');
  return `${original}\n\nUser preferences:\n${lines}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIcon({ status }: { status: AgentStatus }) {
  if (status === 'running') {
    return (
      <span style={{
        display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
        background: T.orange, boxShadow: `0 0 5px ${T.orange}`,
        animation: 'stepPulse 1s ease-in-out infinite', flexShrink: 0,
      }} />
    );
  }
  if (status === 'done') return <span style={{ color: '#34D399', fontSize: '11px', fontWeight: '700' }}>✓</span>;
  if (status === 'error') return <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: '700' }}>✗</span>;
  if (status === 'skipped') return <span style={{ color: '#374151', fontSize: '11px' }}>–</span>;
  return (
    <span style={{
      display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
      background: '#374151', flexShrink: 0,
    }} />
  );
}

function PipelineCard({
  steps,
  blueprint,
  project,
  onViewApp,
}: {
  steps: AgentStep[];
  blueprint?: BuildBlueprint;
  project?: SwiftProject;
  onViewApp: () => void;
}) {
  const isComplete = steps.every(s => s.status === 'done' || s.status === 'skipped' || s.status === 'error');

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: '10px 10px 10px 2px',
      padding: '14px 16px', minWidth: '240px', maxWidth: '90%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '12px', paddingBottom: '10px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: T.orange,
          boxShadow: isComplete ? 'none' : `0 0 8px ${T.orange}`,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: T.text }}>
          {isComplete ? 'Build complete' : 'Building Swift app…'}
        </span>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {AGENT_DEFS.map(def => {
          const step = steps.find(s => s.agent === def.agent) ?? { agent: def.agent, status: 'pending' as AgentStatus, detail: '' };
          const showBlueprint = def.agent === 'architect' && step.status === 'done' && blueprint;
          return (
            <div key={def.agent}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '5px 6px', borderRadius: '6px',
                background: step.status === 'running' ? 'rgba(249,115,22,0.06)' : 'transparent',
              }}>
                <div style={{ width: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <StepIcon status={step.status} />
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: '600', width: '72px', flexShrink: 0,
                  color: step.status === 'running' ? T.orange :
                         step.status === 'done' ? T.text :
                         step.status === 'error' ? '#EF4444' : '#374151',
                }}>
                  {def.label}
                </span>
                <span style={{
                  fontSize: '11px', color: step.status === 'running' ? T.orange :
                    step.status === 'done' ? T.muted : '#374151',
                  lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {step.detail || (step.status === 'pending' ? 'Waiting…' : '')}
                </span>
              </div>

              {/* Blueprint detail under Architect */}
              {showBlueprint && (
                <div style={{
                  margin: '4px 0 6px 24px',
                  padding: '10px 12px',
                  background: 'rgba(249,115,22,0.05)',
                  border: '1px solid rgba(249,115,22,0.15)',
                  borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: T.text }}>{blueprint.appName}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: T.orange, textTransform: 'uppercase' }}>
                      {blueprint.navigationStyle} nav
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {blueprint.screens.map((s, i) => (
                      <div key={s.name} style={{ display: 'flex', gap: '7px' }}>
                        <span style={{ fontSize: '10px', color: T.orange, fontWeight: '700', minWidth: '14px' }}>{i + 1}.</span>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: T.text, fontFamily: 'monospace' }}>{s.name}</span>
                          <span style={{ fontSize: '11px', color: T.muted }}> — {s.purpose}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: `1px solid ${T.border}`, fontSize: '10px', color: '#4B5563' }}>
                    ~{blueprint.estimatedFiles} Swift files · iOS {blueprint.deploymentTarget}+
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isComplete && project && (
        <button onClick={onViewApp} style={{
          display: 'block', width: '100%', textAlign: 'left',
          marginTop: '10px', paddingTop: '10px',
          borderTop: `1px solid ${T.border}`,
          fontSize: '12px', color: T.orange, fontWeight: '600',
          background: 'none', border: 'none', padding: '10px 0 0',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          View Swift code →
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BuildPage() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [prompt, setPrompt] = useReducerState('');
  const [inputFocused, setInputFocused] = useReducerState(false);
  const [projectId, setProjectId] = useReducerState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use simple useState for component-local state (outside reducer)
  const [promptVal, setPromptVal] = useLocalState('');
  const [inputFoc, setInputFoc] = useLocalState(false);
  const [projId, setProjId] = useLocalState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Restore project on mount
  useEffect(() => {
    const storedId = localStorage.getItem(PROJECT_ID_KEY);
    if (!storedId) return;
    setProjId(storedId);
    (async () => {
      try {
        const res = await fetch(`/api/project?projectId=${encodeURIComponent(storedId)}`);
        if (!res.ok) return;
        const { project } = await res.json();
        if (project?.files?.length > 0) {
          dispatch({ type: 'RESTORE_PROJECT', payload: project as SwiftProject });
        }
      } catch { /* silent */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
  };

  // ── Clarify → Build pipeline ────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!promptVal.trim() || state.isBuilding) return;
    const text = promptVal.trim();
    setPromptVal('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Mid-clarification answer
    if (state.clarifyState || clarifyRef.current) {
      // Use clarifyRef — the reducer only stores initial state; the ref tracks live index/answers
      const cs = clarifyRef.current ?? state.clarifyState!;
      const currentQ = cs.questions[cs.currentIndex];
      const updatedAnswers = { ...cs.answers, [currentQ.id]: text };
      const nextIndex = cs.currentIndex + 1;

      if (nextIndex < cs.questions.length) {
        const nextQ = cs.questions[nextIndex];
        dispatch({
          type: 'CLARIFY_ANSWER',
          payload: {
            text,
            nextQuestion: { ...nextQ, index: nextIndex, total: cs.questions.length },
          },
        });
        // Update clarifyState in place — unfortunately useReducer doesn't easily support
        // complex sub-state; use a ref workaround
        clarifyRef.current = { ...cs, answers: updatedAnswers, currentIndex: nextIndex };
      } else {
        dispatch({ type: 'CLARIFY_ANSWER', payload: { text } });
        const pairs = cs.questions.map(q => ({ question: q.text, answer: updatedAnswers[q.id] ?? '' }));
        dispatch({ type: 'CLARIFY_DONE', payload: { pairs } });
        clarifyRef.current = null;
        handleBuild(buildEnrichedPrompt(cs.originalPrompt, cs.questions, updatedAnswers));
      }
      return;
    }

    // New prompt
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const loadingId = `loading-${Date.now()}`;
    const loadingMsg: Message = { id: loadingId, role: 'assistant', content: '', isLoading: true };
    dispatch({ type: 'CLARIFY_LOADING', payload: { userMsg, loadingMsg } });

    try {
      const previousPrompts = state.messages.filter(m => m.role === 'user' && !m.isAnswer).map(m => m.content);
      const res = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, previousPrompts, qaHistory: state.qaHistory }),
      });
      const json = await res.json();

      if (!res.ok || json.sufficient || !json.questions?.length) {
        dispatch({ type: 'CLEAR_LOADING', payload: loadingId });
        handleBuild(text);
        return;
      }

      const questions: ClarificationQuestion[] = json.questions;
      clarifyRef.current = { originalPrompt: text, questions, answers: {}, currentIndex: 0 };
      dispatch({ type: 'CLARIFY_QUESTIONS', payload: { loadingId, questions, originalPrompt: text } });
    } catch {
      dispatch({ type: 'CLEAR_LOADING', payload: loadingId });
      handleBuild(text);
    }
  };

  // We use a ref to track clarifyState because the reducer state update and the
  // conditional branch in handleGenerate can race
  const clarifyRef = useRef<AppState['clarifyState']>(null);

  const handleSkipClarify = () => {
    const cs = clarifyRef.current ?? state.clarifyState;
    if (!cs) return;
    dispatch({ type: 'SKIP_CLARIFY' });
    clarifyRef.current = null;
    handleBuild(buildEnrichedPrompt(cs.originalPrompt, cs.questions, cs.answers));
  };

  const handleDeploy = useCallback(async (project: SwiftProject) => {
    dispatch({ type: 'DEPLOY_START' });
    try {
      const res = await fetch('/api/deploy-appetize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      if (!res.body) throw new Error('No stream body from deploy');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === 'log') {
              dispatch({ type: 'DEPLOY_LOG', payload: event.message as string });
            } else if (event.type === 'complete') {
              dispatch({ type: 'DEPLOY_COMPLETE', payload: { previewUrl: event.previewUrl as string, publicKey: event.publicKey as string } });
            } else if (event.type === 'skipped') {
              dispatch({ type: 'DEPLOY_SKIP' });
            } else if (event.type === 'error') {
              dispatch({ type: 'DEPLOY_LOG', payload: `Error: ${event.message as string}` });
              dispatch({ type: 'DEPLOY_ERROR' });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      dispatch({ type: 'DEPLOY_LOG', payload: `Deploy error: ${err instanceof Error ? err.message : 'unknown'}` });
      dispatch({ type: 'DEPLOY_ERROR' });
    }
  }, []);

  const handleBuild = useCallback(async (enrichedPrompt: string) => {
    const currentProjectId = projId ?? localStorage.getItem(PROJECT_ID_KEY);

    // Get blueprint first
    let blueprint: BuildBlueprint | null = null;
    try {
      const planRes = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: enrichedPrompt }),
      });
      if (planRes.ok) {
        const planData = await planRes.json();
        blueprint = planData.blueprint ?? null;
      }
    } catch { /* proceed without blueprint */ }

    const pipelineId = `pipeline-${Date.now()}`;
    const pipelineMsg: Message = {
      id: pipelineId, role: 'assistant', content: '',
      agentSteps: [...INITIAL_STEPS],
      blueprint: blueprint ?? undefined,
    };
    dispatch({ type: 'BUILD_START', payload: { pipelineMsg } });

    if (blueprint) {
      dispatch({
        type: 'AGENT_UPDATE',
        payload: {
          pipelineId,
          step: { agent: 'architect', status: 'done', detail: `${blueprint.screens.length} screens` },
          blueprint,
        },
      });
    }

    dispatch({
      type: 'AGENT_UPDATE',
      payload: { pipelineId, step: { agent: 'coder', status: 'running', detail: 'Writing Swift files…' } },
    });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint, answers: [], existingCode: undefined }),
      });

      if (!response.ok) throw new Error('Generate request failed');
      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === 'error') throw new Error((event.message as string) || 'Build failed');

          if (event.type === 'file_start') {
            dispatch({ type: 'FILE_START', payload: { filename: event.filename as string } });
            dispatch({
              type: 'AGENT_UPDATE',
              payload: { pipelineId, step: { agent: 'coder', status: 'running', detail: `Writing ${event.filename}…` } },
            });
          } else if (event.type === 'file_chunk') {
            dispatch({ type: 'FILE_CHUNK', payload: { filename: event.filename as string, chunk: event.chunk as string } });
          } else if (event.type === 'file_done') {
            dispatch({ type: 'FILE_DONE', payload: event as unknown as SwiftFile });
          } else if (event.type === 'agent') {
            const step: AgentStep = {
              agent: event.agent as AgentName,
              status: event.status as AgentStatus,
              detail: (event.detail as string) ?? '',
              filesGenerated: event.filesGenerated as string[] | undefined,
            };
            dispatch({
              type: 'AGENT_UPDATE',
              payload: {
                pipelineId,
                step,
                blueprint: event.blueprint as BuildBlueprint | undefined,
              },
            });
          } else if (event.type === 'complete') {
            const project = event.project as SwiftProject;

            // Persist
            try {
              const saveRes = await fetch('/api/project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProjectId ?? undefined, project }),
              });
              if (saveRes.ok) {
                const { savedProject } = await saveRes.json();
                const newId = savedProject?.projectId ?? currentProjectId;
                if (newId) { setProjId(newId); localStorage.setItem(PROJECT_ID_KEY, newId); }
              }
            } catch { /* non-fatal */ }

            dispatch({ type: 'BUILD_COMPLETE', payload: { pipelineId, project } });
            handleDeploy(project);
          }
        }
      }
    } catch (err) {
      dispatch({
        type: 'BUILD_ERROR',
        payload: { pipelineId, message: err instanceof Error ? err.message : 'Build failed' },
      });
    }
  }, [projId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  const canSend = !state.isBuilding && !!promptVal.trim();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes stepPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.25); }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
        background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', color: T.text,
      }}>
        {/* ── Navbar ── */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: '52px', flexShrink: 0,
          background: 'rgba(15,15,19,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/rocket.png" alt="Rocketship" style={{ width: '18px', height: '18px' }} />
            <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px' }}>Rocketship</span>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: T.orange, boxShadow: `0 0 6px ${T.orange}`, flexShrink: 0,
            }} />
            <span style={{ fontSize: '10px', fontWeight: '600', color: T.orange, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Swift · Claude AI
            </span>
          </div>

          {/* Build / deploy status */}
          {(state.isBuilding || state.isDeploying) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: T.orange }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: T.orange, boxShadow: `0 0 6px ${T.orange}`,
                animation: 'stepPulse 1s ease-in-out infinite',
              }} />
              {state.isDeploying ? 'Building iOS binary…' : 'Generating Swift code…'}
            </div>
          )}
        </nav>

        {/* ── Three-panel body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ━━━ PANEL 1: Chat (30%) ━━━ */}
          <div style={{
            width: '30%', minWidth: '280px', maxWidth: '380px',
            display: 'flex', flexDirection: 'column',
            background: T.bg, borderRight: `1px solid ${T.border}`,
          }}>
            {/* Message list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {state.messages.length === 0 && (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', gap: '14px', paddingBottom: '40px',
                }}>
                  <img src="/rocket.png" alt="Rocketship" style={{ width: '48px', height: '48px' }} />
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 6px', color: T.text }}>
                      Build a native iOS app
                    </p>
                    <p style={{ fontSize: '12px', color: T.muted, margin: 0, lineHeight: '1.65', maxWidth: '200px' }}>
                      Describe your app idea. Claude will generate real SwiftUI code.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center' }}>
                    {EXAMPLE_PROMPTS.map(ex => (
                      <button
                        key={ex}
                        onClick={() => { setPromptVal(ex); textareaRef.current?.focus(); }}
                        style={{
                          padding: '5px 12px',
                          background: 'rgba(249,115,22,0.08)',
                          border: '1px solid rgba(249,115,22,0.25)',
                          borderRadius: '16px', fontSize: '12px', color: T.orange,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {state.messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.isLoading ? (
                    <div style={{
                      background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: '10px 10px 10px 2px', padding: '10px 14px',
                      display: 'flex', gap: '5px', alignItems: 'center',
                    }}>
                      <span className="dot dot-1" /><span className="dot dot-2" /><span className="dot dot-3" />
                    </div>
                  ) : msg.agentSteps ? (
                    <PipelineCard
                      steps={msg.agentSteps}
                      blueprint={msg.blueprint}
                      project={msg.project}
                      onViewApp={() => {
                        if (msg.project) dispatch({ type: 'RESTORE_PROJECT', payload: msg.project });
                      }}
                    />
                  ) : msg.role === 'user' ? (
                    <div style={{
                      background: T.orange, color: '#fff',
                      borderRadius: '10px 10px 2px 10px',
                      padding: '9px 13px', maxWidth: '82%',
                      fontSize: '13px', lineHeight: '1.55', wordBreak: 'break-word',
                      boxShadow: '0 2px 12px rgba(249,115,22,0.2)',
                    }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div style={{
                      background: T.surface,
                      border: `1px solid ${msg.questionMeta ? T.orange : T.border}`,
                      borderRadius: '10px 10px 10px 2px',
                      padding: '10px 13px', maxWidth: '86%',
                    }}>
                      {msg.questionMeta && (
                        <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: '700', color: T.orange, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Question {msg.questionMeta.index + 1} of {msg.questionMeta.total}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: '13px', color: msg.questionMeta ? T.text : T.muted, lineHeight: '1.55' }}>
                        {msg.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {state.error && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: T.radius, padding: '10px 13px', fontSize: '12px', color: '#EF4444',
                }}>
                  {state.error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'flex-end',
                background: T.surface,
                border: `1px solid ${inputFoc ? T.orange : T.border}`,
                borderRadius: T.radius, padding: '8px 8px 8px 12px',
                boxShadow: inputFoc ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}>
                <textarea
                  ref={textareaRef}
                  value={promptVal}
                  onChange={e => { setPromptVal(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFoc(true)}
                  onBlur={() => setInputFoc(false)}
                  placeholder={state.clarifyState ? 'Type your answer…' : 'Describe your iOS app…'}
                  rows={1}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    resize: 'none', fontSize: '13px', color: T.text,
                    lineHeight: '1.5', fontFamily: 'inherit',
                    minHeight: '20px', maxHeight: '140px',
                    overflowY: 'auto', caretColor: T.orange,
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!canSend}
                  style={{
                    width: '30px', height: '30px', borderRadius: '50%', border: 'none',
                    background: canSend ? T.orange : '#1F2937',
                    cursor: canSend ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background 0.15s',
                    boxShadow: canSend ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '7px' }}>
                <p style={{ fontSize: '10px', color: '#374151', margin: 0 }}>↵ send · ⇧↵ new line</p>
                {state.clarifyState && (
                  <button
                    onClick={handleSkipClarify}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      fontSize: '10px', color: T.orange, fontWeight: '600',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Skip →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ━━━ PANEL 2: Swift Code Editor (40%) ━━━ */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            borderRight: `1px solid ${T.border}`,
          }}>
            <SwiftCodeEditor
              files={state.currentProject?.files ?? []}
              activeFile={state.activeFile}
              streamingFile={state.streamingFile}
              onFileSelect={filename => dispatch({ type: 'SELECT_FILE', payload: filename })}
              onFileChange={(filename, content) => dispatch({ type: 'FILE_EDITED', payload: { filename, content } })}
            />
          </div>

          {/* ━━━ PANEL 3: iOS Simulator (30%) ━━━ */}
          <div style={{ width: '30%', minWidth: '260px', maxWidth: '380px', overflow: 'hidden' }}>
            <SimulatorPanel
              project={state.currentProject}
              isBuilding={state.isBuilding}
              buildLogs={state.buildLogs}
              isDeploying={state.isDeploying}
              deployLogs={state.deployLogs}
            />
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Local state hooks (simple useState wrappers) ────────────────────────────
// These avoid bloating the reducer with ephemeral UI state.

import { useState } from 'react';

function useReducerState<T>(initial: T) {
  return useState<T>(initial);
}

function useLocalState<T>(initial: T) {
  return useState<T>(initial);
}
