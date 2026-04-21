'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { Loader2, Play, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';

import { generateSpeech } from '@/lib/actions/speech';

type Size = 'sm' | 'md' | 'lg';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; audioUrl: string }
  | { kind: 'error'; message: string };

export function SpeechButton({
  text,
  slow = false,
  size = 'md',
  label = '発音を聞く',
}: {
  text: string;
  slow?: boolean;
  size?: Size;
  label?: string;
}) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function ensureAndPlay() {
    if (state.kind === 'ready') {
      play(state.audioUrl);
      return;
    }
    setState({ kind: 'loading' });
    const res = await generateSpeech({ text, slow });
    if (!res.ok) {
      setState({ kind: 'error', message: describe(res.error) });
      return;
    }
    setState({ kind: 'ready', audioUrl: res.audioUrl });
    play(res.audioUrl);
  }

  function play(url: string) {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
      audioRef.current.addEventListener('pause', () => setPlaying(false));
    } else if (audioRef.current.src !== url) {
      audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
      audioRef.current.addEventListener('pause', () => setPlaying(false));
    }
    audioRef.current.currentTime = 0;
    setPlaying(true);
    void audioRef.current.play().catch(() => setPlaying(false));
  }

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  const icon =
    state.kind === 'loading' ? (
      <Loader2 size={iconSize} className="spin" />
    ) : state.kind === 'error' ? (
      <VolumeX size={iconSize} />
    ) : playing ? (
      <Volume2 size={iconSize} />
    ) : state.kind === 'ready' ? (
      <Play size={iconSize} />
    ) : (
      <Volume2 size={iconSize} />
    );

  const tooltip =
    state.kind === 'error' ? state.message : slow ? 'ゆっくり再生' : label;

  return (
    <Tooltip label={tooltip} withArrow openDelay={400}>
      <ActionIcon
        onClick={ensureAndPlay}
        disabled={state.kind === 'loading'}
        variant={playing ? 'filled' : 'light'}
        color={state.kind === 'error' ? 'red' : 'grape'}
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'xl' : 'lg'}
        radius="xl"
        aria-label={label}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}

function describe(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'サインインが必要です';
    case 'RATE_LIMITED':
      return 'リクエストが多すぎます';
    case 'NOT_CONFIGURED':
      return 'GEMINI_API_KEY が未設定です';
    case 'TTS_FAILED':
      return '音声生成に失敗しました';
    case 'INVALID':
      return 'テキストが無効です';
    default:
      return 'エラー';
  }
}
