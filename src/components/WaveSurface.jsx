import React, { useMemo, useState, useEffect, useRef } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import WaveSurfer from "wavesurfer.js";
import Timeline from "wavesurfer.js/dist/plugins/timeline.esm.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
const { diffWords } = require("diff");

// Імпортуємо дефолтний файл, що лежить в тій же папці
import defaultAudio from "./file_example_WAV_2MG.wav";

function WaveSurface() {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const recordPluginRef = useRef(null);

  const [audioURL, setAudioURL] = useState(defaultAudio);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState(null);
  const [diffResult, setDiffResult] = useState([]);
  const originalText = "Today I am learning English pronunciation";

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Створюємо основний інстанс WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 120,
      waveColor: "#4f46e5",
      progressColor: "#06b6d4",
      cursorColor: "#e11d48",
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      responsive: true,
      plugins: [
        Timeline.create({
          style: { color: "#6b7280", fontSize: "11px" },
        }),
      ],
    });

    wavesurferRef.current = ws;

    // 2. Ініціалізуємо Record Plugin для реалтайм візуалізації
    const record = ws.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: true,
        renderRecordedAudio: false,
      }),
    );
    recordPluginRef.current = record;

    // 3. ПЕРЕХОПЛЕННЯ ПОМИЛОК (ГАСИТЬ ABORTERROR В REACT STRICT MODE)
    ws.on("error", (err) => {
      // Якщо це помилка скасування запиту — просто ігноруємо її, це нормальна поведінка
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        return;
      }
      console.error("Wavesurfer Error:", err);
    });

    // Слухаємо події для оновлення UI стану
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("timeupdate", (time) => setCurrentTime(time));

    // Коли запис завершено, отримуємо blob, перетворюємо в URL і оновлюємо трек
    record.on("record-end", (blob) => {
      addAudioElement(blob);
    });

    // Завантажуємо поточне аудіо
    ws.load(audioURL);

    // Очищення при демонтажі компонента
    return () => {
      ws.destroy();
    };
  }, [audioURL]);

  const addAudioElement = async (blob) => {
    try {
      const url = URL.createObjectURL(blob);
      setAudioURL(url);

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const response = await fetch("http://localhost:3001/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data);

      const transcriptText = data.transcript;
      setTranscript(transcriptText);

      // DIFF
      const differences = diffWords(
        originalText.replace(/[^\w\s]/g, "").toLowerCase(),
        transcriptText.toLowerCase(),
      );
      setDiffResult(differences);

      // SCORE
      const totalWords = originalText.split(" ").length;
      const wrongWords = differences.filter((part) => part.added || part.removed).length;
      const pronunciationScore = Math.max(
        0,
        Math.round(((totalWords - wrongWords) / totalWords) * 100),
      );

      setScore(pronunciationScore);
    } catch (error) {
      console.error(error);
    }
  };

  // Функція старту / зупинки запису в реальному часі
  const toggleRecording = async () => {
    const record = recordPluginRef.current;
    if (!record) return;

    if (isRecording) {
      record.stopRecording();
      setIsRecording(false);
    } else {
      try {
        setIsPlaying(false);
        setIsRecording(true);

        // Очищаємо стару хвилю перед початком запису нової
        wavesurferRef.current.empty();

        // Запускаємо запис з мікрофона з реалтайм відмальовкою
        await record.startRecording();
      } catch (err) {
        console.error("Помилка доступу до мікрофона:", err);
        setIsRecording(false);
      }
    }
  };

  const togglePlay = () => {
    if (wavesurferRef.current && !isRecording) {
      wavesurferRef.current.playPause();
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "#121214",
        borderRadius: "16px",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "20px", fontWeight: "500", letterSpacing: "0.5px" }}>
        Аудіозапис з Realtime Waveform
      </h3>

      <h1>Voice Recorder</h1>
      <h3>Read this sentence:</h3>

      <p style={{ fontSize: 24, fontWeight: "bold" }}> {originalText}</p>

      <div style={{ marginBottom: "25px", display: "flex", alignItems: "center", gap: "15px" }}>
        <button
          onClick={toggleRecording}
          style={{
            backgroundColor: isRecording ? "#ef4444" : "#22c55e",
            color: "white",
            border: "none",
            padding: "10px 24px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "background 0.2s",
          }}
        >
          {isRecording ? "🔴 Зупинити запис" : "🎤 Почати запис (Realtime)"}
        </button>

        <span style={{ fontSize: "14px", color: "#a1a1aa" }}>
          {isRecording ? "Запис триває, говоріть у мікрофон..." : "Готово до запису"}
        </span>
      </div>

      <div
        style={{
          backgroundColor: "#18181b",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #27272a",
        }}
      >
        <div
          ref={containerRef}
          style={{ background: "#09090b", borderRadius: "6px", padding: "10px 0" }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
          }}
        >
          <button
            onClick={togglePlay}
            disabled={isRecording}
            style={{
              backgroundColor: isPlaying ? "#f43f5e" : "#06b6d4",
              color: "white",
              border: "none",
              padding: "8px 24px",
              borderRadius: "20px",
              cursor: isRecording ? "not-allowed" : "pointer",
              fontWeight: "600",
              opacity: isRecording ? 0.5 : 1,
            }}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>

          <div style={{ fontSize: "14px", color: "#a1a1aa", fontFamily: "monospace" }}>
            {isRecording ? "Запис..." : `Час: ${formatTime(currentTime)}`}
          </div>
        </div>
      </div>

      {transcript && (
        <div style={{ marginTop: 30 }}>
          <h3>Transcript:</h3>

          <p>{transcript}</p>
        </div>
      )}

      {score !== null && (
        <div style={{ marginTop: 20 }}>
          <h2>Pronunciation Score: {score}%</h2>
        </div>
      )}

      {diffResult.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Mistakes:</h3>

          <p
            style={{
              fontSize: 22,
              lineHeight: 1.8,
            }}
          >
            {diffResult.map((part, index) => {
              let color = "white";

              if (part.added) {
                color = "green";
              }

              if (part.removed) {
                color = "red";
              }

              return (
                <span
                  key={index}
                  style={{
                    color,
                    fontWeight: part.added || part.removed ? "bold" : "normal",
                    textDecoration: part.removed ? "line-through" : "none",
                  }}
                >
                  {part.value}
                </span>
              );
            })}
          </p>
        </div>
      )}
    </div>
  );
}

export default WaveSurface;
