import React, { useMemo, useState, useRef } from "react";
import { AudioRecorder } from "react-audio-voice-recorder";
import { useWavesurfer } from "@wavesurfer/react";
import Timeline from "wavesurfer.js/dist/plugins/timeline.esm.js";
const { diffWords } = require("diff");

function VoiceRecorder() {
  const containerRef = useRef(null);

  const [audioURL, setAudioURL] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState(null);
  const [diffResult, setDiffResult] = useState([]);
  const originalText = "Today I am learning English pronunciation";

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    height: 100,
    waveColor: "rgb(200, 0, 200)",
    progressColor: "rgb(100, 0, 100)",
    url: audioURL, //current URL
    plugins: useMemo(() => [Timeline.create()], []),
  });

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

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Voice Recorder</h1>
      <h3>Read this sentence:</h3>

      <p
        style={{
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        {originalText}
      </p>

      <AudioRecorder
        onRecordingComplete={addAudioElement}
        audioTrackConstraints={{
          noiseSuppression: true,
          echoCancellation: true,
        }}
        downloadOnSavePress={false}
        downloadFileExtension="webm"
      />

      {audioURL && (
        <div style={{ marginTop: 20 }}>
          <audio src={audioURL} controls />
          <div ref={containerRef} />
        </div>
      )}

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
              let color = "black";

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

export default VoiceRecorder;
