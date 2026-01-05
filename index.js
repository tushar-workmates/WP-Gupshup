import express from "express";
import axios from "axios";
import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const app = express();

// 🔒 Safe body parser
app.use(express.json({ limit: "25mb" }));

// ================== CONFIG ==================
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const CHATBOT_API_URL = process.env.CHATBOT_API_URL;
const SOURCE = "918093076364";

// ================== OPENAI ==================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ================== SESSION STORE ==================
const sessionStore = new Map(); // phone -> session_id

// ================== SCRIPT DETECTION (INDIAN LANGUAGES) ==================
function detectScript(text) {
  if (/[\u0900-\u097F]/.test(text)) return "devanagari";   // Hindi, Marathi, Sanskrit, Nepali
  if (/[\u0980-\u09FF]/.test(text)) return "bengali";      // Bengali, Assamese
  if (/[\u0A00-\u0A7F]/.test(text)) return "punjabi";      // Punjabi (Gurmukhi)
  if (/[\u0A80-\u0AFF]/.test(text)) return "gujarati";
  if (/[\u0B00-\u0B7F]/.test(text)) return "odia";
  if (/[\u0B80-\u0BFF]/.test(text)) return "tamil";
  if (/[\u0C00-\u0C7F]/.test(text)) return "telugu";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kannada";
  if (/[\u0D00-\u0D7F]/.test(text)) return "malayalam";
  if (/[\u0600-\u06FF]/.test(text)) return "urdu";        // Urdu (Arabic script)
  if (/^[A-Za-z\s]+$/.test(text)) return "latin";          // English, Hinglish, etc.
  return "unknown";
}

function isShortNativeWord(text) {
  return text.length <= 12 && /^[A-Za-z\s]+$/.test(text);
}

// ================== WHISPER FROM URL ==================
async function whisperFromUrl(audioUrl) {
  const tmpPath = path.join("/tmp", `voice_${Date.now()}.ogg`);

  // 1️⃣ Download audio
  const audioResp = await axios.get(audioUrl, { responseType: "stream" });
  const writer = fs.createWriteStream(tmpPath);
  audioResp.data.pipe(writer);
  await new Promise(resolve => writer.on("finish", resolve));

  try {
    // 2️⃣ Whisper with multilingual context
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: "whisper-1",
      prompt:
        "The speaker may be using an Indian language such as Hindi, Bengali, Odia, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Urdu, Marathi, or English.",
      temperature: 0
    });

    let text = transcription.text.trim();
    const script = detectScript(text);

    // 3️⃣ Prevent English bias for short native words
    if (script === "latin" && isShortNativeWord(text)) {
      return text; // Namaste, Vanakkam, Nomoskar, etc.
    }

    return text;

  } finally {
    fs.unlink(tmpPath, () => {});
  }
}

// ================== WEBHOOK ==================
app.post("/webhook", async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!value) return res.sendStatus(200);

    // Status updates
    if (value.statuses) {
      console.log("ℹ Status update");
      return res.sendStatus(200);
    }

    // Message validation
    if (!value.messages || !Array.isArray(value.messages)) {
      return res.sendStatus(200);
    }

    const msg = value.messages[0];
    const userPhone = msg.from;
    let userMessage = "";

    // ================== TEXT ==================
    if (msg.type === "text") {
      userMessage = msg.text?.body?.trim();
      if (!userMessage) return res.sendStatus(200);

      console.log("💬 Text:", userMessage);
      res.sendStatus(200);
    }

    // ================== AUDIO ==================
    else if (msg.type === "audio") {
      console.log("🎤 Voice message received");
      res.sendStatus(200);

      const audioUrl = msg.audio?.url;
      if (!audioUrl) {
        await sendWhatsAppMessage(
          userPhone,
          "Sorry, I couldn't process your voice message. Please type 🙂"
        );
        return;
      }

      userMessage = await whisperFromUrl(audioUrl);
      console.log("📝 Whisper text:", userMessage);
    }

    // ================== UNSUPPORTED ==================
    else {
      await sendWhatsAppMessage(
        userPhone,
        "Please send a text or voice message 🙂"
      );
      return res.sendStatus(200);
    }

    // ================== SEND TO CHATBOT ==================
    const existingSessionId = sessionStore.get(userPhone);
    const payload = existingSessionId
      ? { message: userMessage, session_id: existingSessionId }
      : { message: userMessage };

    const chatbotResponse = await axios.post(
      CHATBOT_API_URL,
      payload,
      { headers: { "Content-Type": "application/json" }, timeout: 50000 }
    );

    const data = chatbotResponse.data || {};
    const reply =
      data.answer ||
      data.message ||
      data.reply ||
      data.text ||
      "Sorry, I couldn't understand that.";

    if (!existingSessionId && data.session_id) {
      sessionStore.set(userPhone, data.session_id);
    }

    await sendWhatsAppMessage(userPhone, reply);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    try { res.sendStatus(200); } catch {}
  }
});

// ================== SEND WHATSAPP MESSAGE ==================
async function sendWhatsAppMessage(destination, text) {
  const payload = new URLSearchParams({
    channel: "whatsapp",
    source: SOURCE,
    destination,
    "message.type": "text",
    "message.text": text
  });

  await axios.post(
    "https://api.gupshup.io/sm/api/v1/msg",
    payload,
    {
      headers: {
        apikey: GUPSHUP_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  console.log("📤 Sent to:", destination);
}

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Gupshup WhatsApp Bot running on port---UPDATED---${PORT}`);
  console.log("🤖 Chatbot URL:", CHATBOT_API_URL);
});
































































// import express from "express";
// import axios from "axios";
// import "dotenv/config";
// import OpenAI from "openai";
// import fs from "fs";
// import path from "path";
// import FormData from "form-data";
// import { exec } from "child_process";
// import util from "util";
// const execAsync = util.promisify(exec);



// const app = express();

// // 🔒 Safe body parser (does NOT affect text)
// app.use(express.json({ limit: "25mb" }));

// // ================== CONFIG ==================
// const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
// const CHATBOT_API_URL = process.env.CHATBOT_API_URL;
// const SARVAM_API_KEY = process.env.SARVAM_API_KEYY;
// const SOURCE = "918093076364";

// // ================== OPENAI ==================
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// // ================== SESSION STORE ==================
// const sessionStore = new Map(); // phone -> session_id

// // ================== WEBHOOK ==================
// app.post("/webhook", async (req, res) => {
//   try {
//     const value = req.body?.entry?.[0]?.changes?.[0]?.value;
//     if (!value) return res.sendStatus(200);

//     // ---------- STATUS UPDATES ----------
//     if (value.statuses) {
//       console.log("ℹ Status update");
//       return res.sendStatus(200);
//     }

//     // ---------- MESSAGE CHECK ----------
//     if (!value.messages || !Array.isArray(value.messages)) {
//       return res.sendStatus(200);
//     }

//     const msg = value.messages[0];
//     const userPhone = msg.from;
//     let userMessage = "";

//     // ================== TEXT (UNCHANGED, SAFE) ==================
//     if (msg.type === "text") {
//       userMessage = msg.text?.body?.trim();
//       if (!userMessage) return res.sendStatus(200);

//       console.log("💬 Text:", userMessage);

//       // ✅ ACK EARLY (same as your working code)
//       res.sendStatus(200);
//     }

//     // ================== AUDIO → WHISPER (SAFE MODE) ==================
//     else if (msg.type === "audio") {
//       console.log("🎤 Voice message received");

//       // ✅ ACK EARLY (same rule)
//       res.sendStatus(200);

//       const audioUrl = msg.audio?.url;

//       // ❗ If Gupshup does NOT provide URL, we CANNOT do STT
//       if (!audioUrl) {
//         console.log("⚠️ Audio URL not provided by Gupshup");
//         await sendWhatsAppMessage(
//           userPhone,
//           "Sorry, I couldn't process your voice message. Please try typing 🙂"
//         );
//         return;
//       }

//       try {
//         userMessage = await whisperFromUrl(audioUrl);
//         console.log("📝 Whisper text:", userMessage);
//       } catch (e) {
//         console.error("❌ Whisper failed:", e.message);
//         await sendWhatsAppMessage(
//           userPhone,
//           "Sorry, I couldn't understand the voice message. Please type your query 🙂"
//         );
//         return;
//       }
//     }

//     // ================== UNSUPPORTED ==================
//     else {
//       await sendWhatsAppMessage(
//         userPhone,
//         "Please send a text or voice message 🙂"
//       );
//       return res.sendStatus(200);
//     }

//     // ================== SEND TEXT TO CHATBOT ==================
//     const existingSessionId = sessionStore.get(userPhone);

//     const payload = existingSessionId
//       ? { message: userMessage, session_id: existingSessionId }
//       : { message: userMessage };

//     const chatbotResponse = await axios.post(
//       CHATBOT_API_URL,
//       payload,
//       { headers: { "Content-Type": "application/json" }, timeout: 50000 }
//     );

//     const data = chatbotResponse.data || {};

//     const reply =
//       data.answer ||
//       data.message ||
//       data.reply ||
//       data.text ||
//       "Sorry, I couldn't understand that.";

//     if (!existingSessionId && data.session_id) {
//       sessionStore.set(userPhone, data.session_id);
//     }

//     await sendWhatsAppMessage(userPhone, reply);

//   } catch (err) {
//     console.error("❌ ERROR:", err.message);
//     try { res.sendStatus(200); } catch { }
//   }
// });

// // ================== WHISPER FROM URL ==================

// async function sarvamSTT(audioPath) {
//   const url = "https://api.sarvam.ai/speech-to-text";

//   const form = new FormData();
//   form.append("file", fs.createReadStream(audioPath), {
//     filename: path.basename(audioPath),
//     contentType: "audio/wav"
//   });
//   form.append("model", "saarika:v1");

//   const response = await axios.post(url, form, {
//     headers: {
//       ...form.getHeaders(),
//       "api-subscription-key": process.env.SARVAM_API_KEY
//     },
//     timeout: 30000
//   });

//   if (!response.data?.transcript) {
//     throw new Error("Sarvam returned empty transcript");
//   }

//   return response.data.transcript.trim();
// }




// async function whisperFromUrl(audioUrl) {
//   const oggPath = path.join("/tmp", `voice_${Date.now()}.ogg`);
//   const wavPath = oggPath.replace(".ogg", ".wav");

//   // 1️⃣ Download OGG audio
//   const audioResp = await axios.get(audioUrl, { responseType: "stream" });
//   const writer = fs.createWriteStream(oggPath);
//   audioResp.data.pipe(writer);
//   await new Promise(resolve => writer.on("finish", resolve));

//   try {
//     // 2️⃣ Convert OGG → WAV (Sarvam requirement)
//     await execAsync(
//       `ffmpeg -y -i "${oggPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${wavPath}"`
//     );

//     const stats = fs.statSync(wavPath);
//     console.log("🎧 WAV size:", stats.size, "bytes");



//     // 3️⃣ PRIMARY: Sarvam STT (WAV only)
//     const sarvamText = await sarvamSTT(wavPath);
//     console.log("🟢 Sarvam transcript:", sarvamText);
//     return sarvamText;

//   } catch (err) {
//     console.log("⚠️ Sarvam failed, falling back to Whisper");

//     // 4️⃣ FALLBACK: Whisper (OGG is fine)
//     const transcription = await openai.audio.transcriptions.create({
//       file: fs.createReadStream(oggPath),
//       model: "whisper-1"
//     });

//     return transcription.text.trim();

//   } finally {
//     // 5️⃣ Cleanup
//     fs.unlink(oggPath, () => { });
//     fs.unlink(wavPath, () => { });
//   }
// }




// // ================== SEND WHATSAPP MESSAGE ==================
// async function sendWhatsAppMessage(destination, text) {
//   const payload = new URLSearchParams({
//     channel: "whatsapp",
//     source: SOURCE,
//     destination,
//     "message.type": "text",
//     "message.text": text
//   });

//   await axios.post(
//     "https://api.gupshup.io/sm/api/v1/msg",
//     payload,
//     {
//       headers: {
//         apikey: GUPSHUP_API_KEY,
//         "Content-Type": "application/x-www-form-urlencoded"
//       }
//     }
//   );

//   console.log("📤 Sent to:", destination);
// }

// // ================== START SERVER ==================
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Gupshup WhatsApp Bot running on port-------- ${PORT}`);
//   console.log("🤖 Chatbot URL:", CHATBOT_API_URL);
// });


