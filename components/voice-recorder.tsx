"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteRecording,
  listRecordingsForAyah,
  pickRecordingMimeType,
  saveRecording,
  type LocalRecording,
} from "@/lib/recordings/store";

type Props = {
  ayahId: number;
};

/**
 * Enregistreur vocal pour un verset donné.
 *
 *  - Bouton "Mic" : démarre l'enregistrement (demande la permission micro
 *    au 1er essai).
 *  - Bouton "Stop" : arrête, persiste le blob en IndexedDB.
 *  - Liste des enregistrements précédents : play/pause + suppression.
 *
 * iOS Safari : `MediaRecorder` ne supporte que `audio/mp4`. La fonction
 * `pickRecordingMimeType()` choisit le bon mime selon la plateforme.
 */
export function VoiceRecorder({ ayahId }: Props) {
  const [state, setState] = useState<"idle" | "recording">("idle");
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void listRecordingsForAyah(ayahId).then(setRecordings);
  }, [ayahId]);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationMs = Date.now() - startedAtRef.current;
        await saveRecording({ ayahId, blob, durationMs, mimeType });
        setRecordings(await listRecordingsForAyah(ayahId));
        toast.success("Enregistré");
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setState("recording");
      setElapsed(0);
      tickerRef.current = setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 100);
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast.error("Impossible d'accéder au micro. Vérifie l'autorisation du navigateur.");
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    setState("idle");
  }

  async function handleDelete(id: number) {
    await deleteRecording(id);
    setRecordings(await listRecordingsForAyah(ayahId));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {state === "idle" ? (
          <Button variant="outline" size="sm" onClick={start}>
            <Mic className="size-4" />
            <span className="ms-1">M'enregistrer</span>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={stop}
            className="bg-red-600 hover:bg-red-700"
          >
            <Square className="size-3.5 fill-current" />
            <span className="ms-1 tabular-nums">{formatElapsed(elapsed)}</span>
          </Button>
        )}
      </div>

      {recordings.length > 0 ? (
        <ul className="space-y-1.5">
          {recordings.map((rec) => (
            <RecordingRow key={rec.id} rec={rec} onDelete={handleDelete} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RecordingRow({
  rec,
  onDelete,
}: {
  rec: LocalRecording;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(rec.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [rec.blob]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Lire l'enregistrement"}
        className={cn("h-7 px-2 text-muted-foreground hover:text-foreground")}
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </Button>
      <span className="tabular-nums">{formatElapsed(rec.durationMs)}</span>
      <span aria-hidden>·</span>
      <span>{formatRelativeTime(rec.createdAt)}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => rec.id != null && void onDelete(rec.id)}
        aria-label="Supprimer cet enregistrement"
        className="ms-auto h-7 w-7 px-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      ) : null}
    </li>
  );
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatRelativeTime(ts: number): string {
  const sec = (Date.now() - ts) / 1000;
  if (sec < 60) return "à l'instant";
  if (sec < 3600) return `il y a ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `il y a ${Math.floor(sec / 3600)} h`;
  return `il y a ${Math.floor(sec / 86400)} j`;
}
