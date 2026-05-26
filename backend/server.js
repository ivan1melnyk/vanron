const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");

const path = require("path");

const speech = require("@google-cloud/speech");

const app = express();

app.use(cors());

const upload = multer({
  dest: "uploads/",
});

const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, "credentials/credentials.json"),
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // читаємо файл
    const file = fs.readFileSync(filePath);

    // переводимо в base64
    const audioBytes = file.toString("base64");

    // config для Google
    const request = {
      audio: {
        content: audioBytes,
      },

      config: {
        encoding: "WEBM_OPUS",
        //sampleRateHertz: 48000,
        languageCode: "en-US",
      },
    };

    // викликаємо API
    const [response] = await client.recognize(request);

    // збираємо transcript
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    // видаляємо temp файл
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      transcript: transcription,
    });
    console.log("Transcription: ", transcription);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
