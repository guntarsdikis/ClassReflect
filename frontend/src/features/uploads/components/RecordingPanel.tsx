import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Group, Stack, Text, Alert, Progress, Badge } from '@mantine/core';
import { IconMicrophone, IconPlayerPause, IconPlayerPlay, IconPlayerStop, IconAlertCircle } from '@tabler/icons-react';
import { RecordingService, RecordingState, blobToFile } from '../../../services/recording.service';

interface RecordingPanelProps {
  onRecorded: (file: File) => void;
  onError?: (message: string) => void;
}

export function RecordingPanel({ onRecorded, onError }: RecordingPanelProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [supported, setSupported] = useState<boolean | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [level, setLevel] = useState(0);
  const [mime, setMime] = useState<string>('');
  const [lowInput, setLowInput] = useState(false);
  const serviceRef = useRef<RecordingService | null>(null);
  const timerRef = useRef<number | null>(null);
  const silentSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const svc = new RecordingService({ enableLevelMeter: true, timesliceMs: 1000 });
    serviceRef.current = svc;
    svc.isSupported().then(setSupported);
    setMime(svc.pickSupportedMimeType() || '');
    return () => {
      clearTimer();
      svc.destroy();
      serviceRef.current = null;
    };
  }, []);

  const startTimer = () => {
    clearTimer();
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      setDurationSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  };
  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatted = useMemo(() => {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [durationSec]);

  const levelPct = Math.min(100, Math.round(level * 140)); // simple visual scaling

  const start = async () => {
    try {
      await serviceRef.current!.start({
        onLevel: (rms) => {
          setLevel(rms);
          // Detect low input for > 4s during active recording
          const now = Date.now();
          const silent = rms < 0.01; // threshold for near-silence
          if (state === 'recording') {
            if (silent) {
              if (silentSinceRef.current == null) silentSinceRef.current = now;
              const elapsed = now - (silentSinceRef.current || now);
              setLowInput(elapsed > 4000);
            } else {
              silentSinceRef.current = null;
              if (lowInput) setLowInput(false);
            }
          }
        },
        onError: (e) => onError?.(e.message || 'Recording error'),
      });
      setState('recording');
      setDurationSec(0);
      startTimer();
      setMime(serviceRef.current!.getMimeType() || '');
    } catch (e: any) {
      setState('error');
      onError?.(e?.message || 'Failed to start recording');
    }
  };

  const pause = () => {
    serviceRef.current?.pause();
    setState('paused');
    clearTimer();
  };
  const resume = () => {
    serviceRef.current?.resume();
    setState('recording');
    startTimer();
  };
  const stop = async () => {
    try {
      clearTimer();
      const blob = await serviceRef.current!.stop();
      setState('stopped');
      const filename = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${guessExtension(blob.type)}`;
      const file = blobToFile(blob, filename);
      onRecorded(file);
    } catch (e: any) {
      setState('error');
      onError?.(e?.message || 'Failed to stop recording');
    }
  };

  if (supported === false) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
        <Text>Recording is not supported in this browser. Please try a modern browser (Chrome, Edge, Firefox, Safari 14+), or use the file upload option.</Text>
      </Alert>
    );
  }

  return (
    <Stack>
      <Alert variant="light" color="blue">
        <Text size="sm" fw={500}>Recording Tips</Text>
        <Text size="sm">
          Keep the device screen awake on mobile, speak a short test phrase to confirm input, and stay near the microphone. If issues persist, switch to Upload File.
        </Text>
      </Alert>
      <Group justify="space-between">
        <Badge variant="light" color={state === 'recording' ? 'green' : state === 'paused' ? 'yellow' : 'gray'}>
          {state === 'recording' ? 'Recording' : state === 'paused' ? 'Paused' : 'Ready'}
        </Badge>
        <Text size="lg" fw={500}>{formatted}</Text>
      </Group>

      <Stack gap={6}>
        <Text size="sm" c="dimmed">Microphone level</Text>
        <Progress value={levelPct} size="lg" radius="xl"/>
      </Stack>

      <Group justify="center">
        {(state === 'idle' || state === 'stopped') && (
          <Button onClick={start} leftSection={<IconMicrophone size={18} />}>Start Recording</Button>
        )}
        {state === 'recording' && (
          <>
            <Button variant="outline" onClick={pause} leftSection={<IconPlayerPause size={18} />}>Pause</Button>
            <Button color="red" onClick={stop} leftSection={<IconPlayerStop size={18} />}>Stop & Use Recording</Button>
          </>
        )}
        {state === 'paused' && (
          <>
            <Button onClick={resume} leftSection={<IconPlayerPlay size={18} />}>Resume</Button>
            <Button color="red" onClick={stop} leftSection={<IconPlayerStop size={18} />}>Stop & Use Recording</Button>
          </>
        )}
      </Group>

      {mime && (
        <Text size="xs" c="dimmed">Format: {mime}</Text>
      )}

      {lowInput && state === 'recording' && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
          <Text size="sm">We’re not detecting microphone input. Check mic permissions, input device selection, or move closer to the microphone.</Text>
        </Alert>
      )}
    </Stack>
  );
}

function guessExtension(mime: string): string {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}
