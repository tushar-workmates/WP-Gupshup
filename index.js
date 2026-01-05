// import express from "express";
// import axios from "axios";
// import "dotenv/config";
// import OpenAI from "openai";
// import fs from "fs";
// import path from "path";

// const app = express();

// // 🔒 Safe body parser (does NOT affect text)
// app.use(express.json({ limit: "25mb" }));

// // ================== CONFIG ==================
// const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
// const CHATBOT_API_URL = process.env.CHATBOT_API_URL;
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
//     try { res.sendStatus(200); } catch {}
//   }
// });

// // ================== WHISPER FROM URL ==================
// async function whisperFromUrl(audioUrl) {
//   // 1️⃣ Download audio to temp file
//   const tmpPath = path.join(
//     "/tmp",
//     `voice_${Date.now()}.ogg`
//   );

//   const audioResp = await axios.get(audioUrl, { responseType: "stream" });
//   const writer = fs.createWriteStream(tmpPath);
//   audioResp.data.pipe(writer);

//   await new Promise(resolve => writer.on("finish", resolve));

//   // 2️⃣ Send file stream to Whisper
//   const transcription = await openai.audio.transcriptions.create({
//     file: fs.createReadStream(tmpPath), // ✅ REQUIRED
//     model: "whisper-1"
//   });

//   // 3️⃣ Cleanup
//   fs.unlink(tmpPath, () => {});

//   return transcription.text.trim();
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
//   console.log(`🚀 Gupshup WhatsApp Bot running on port>>>>>> ${PORT}`);
//   console.log("🤖 Chatbot URL:", CHATBOT_API_URL);
// });



import express from "express";
import axios from "axios";
import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import FormData from "form-data";


const app = express();

// 🔒 Safe body parser (does NOT affect text)
app.use(express.json({ limit: "25mb" }));

// ================== CONFIG ==================
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const CHATBOT_API_URL = process.env.CHATBOT_API_URL;
const SARVAM_API_KEY = process.env.SARVAM_API_KEYY;
const SOURCE = "918093076364";

// ================== OPENAI ==================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ================== SESSION STORE ==================
const sessionStore = new Map(); // phone -> session_id

// ================== WEBHOOK ==================
app.post("/webhook", async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!value) return res.sendStatus(200);

    // ---------- STATUS UPDATES ----------
    if (value.statuses) {
      console.log("ℹ Status update");
      return res.sendStatus(200);
    }

    // ---------- MESSAGE CHECK ----------
    if (!value.messages || !Array.isArray(value.messages)) {
      return res.sendStatus(200);
    }

    const msg = value.messages[0];
    const userPhone = msg.from;
    let userMessage = "";

    // ================== TEXT (UNCHANGED, SAFE) ==================
    if (msg.type === "text") {
      userMessage = msg.text?.body?.trim();
      if (!userMessage) return res.sendStatus(200);

      console.log("💬 Text:", userMessage);

      // ✅ ACK EARLY (same as your working code)
      res.sendStatus(200);
    }

    // ================== AUDIO → WHISPER (SAFE MODE) ==================
    else if (msg.type === "audio") {
      console.log("🎤 Voice message received");

      // ✅ ACK EARLY (same rule)
      res.sendStatus(200);

      const audioUrl = msg.audio?.url;

      // ❗ If Gupshup does NOT provide URL, we CANNOT do STT
      if (!audioUrl) {
        console.log("⚠️ Audio URL not provided by Gupshup");
        await sendWhatsAppMessage(
          userPhone,
          "Sorry, I couldn't process your voice message. Please try typing 🙂"
        );
        return;
      }

      try {
        userMessage = await whisperFromUrl(audioUrl);
        console.log("📝 Whisper text:", userMessage);
      } catch (e) {
        console.error("❌ Whisper failed:", e.message);
        await sendWhatsAppMessage(
          userPhone,
          "Sorry, I couldn't understand the voice message. Please type your query 🙂"
        );
        return;
      }
    }

    // ================== UNSUPPORTED ==================
    else {
      await sendWhatsAppMessage(
        userPhone,
        "Please send a text or voice message 🙂"
      );
      return res.sendStatus(200);
    }

    // ================== SEND TEXT TO CHATBOT ==================
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

// ================== WHISPER FROM URL ==================

async function sarvamSTT(audioPath) {
  const url = "https://api.sarvam.ai/speech-to-text";

  const form = new FormData();
  form.append("file", fs.createReadStream(audioPath));
  form.append("model", "saarika:v1");
  // Optional: language_code can be omitted for auto-detect

  try {
    const resp = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        "API-Subscription-Key": SARVAM_API_KEY
      },
      timeout: 30000
    });

    if (!resp.data?.transcript) {
      throw new Error("Empty Sarvam transcript");
    }

    return resp.data.transcript.trim();
  } catch (err) {
    console.error("❌ Sarvam STT failed:", err.message);
    throw err;
  }
}



async function whisperFromUrl(audioUrl) {
  const tmpPath = path.join("/tmp", `voice_${Date.now()}.ogg`);

  // 1️⃣ Download audio
  const audioResp = await axios.get(audioUrl, { responseType: "stream" });
  const writer = fs.createWriteStream(tmpPath);
  audioResp.data.pipe(writer);
  await new Promise(resolve => writer.on("finish", resolve));

  try {
    // 2️⃣ FIRST TRY: Sarvam (Indian languages)
    const sarvamText = await sarvamSTT(tmpPath);
    console.log("🟢 Sarvam transcript:", sarvamText);
    return sarvamText;
  } catch {
    // 3️⃣ FALLBACK: Whisper
    console.log("⚠️ Falling back to Whisper");

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: "whisper-1"
    });

    return transcription.text.trim();
  } finally {
    // 4️⃣ Cleanup
    fs.unlink(tmpPath, () => {});
  }
}


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
  console.log(`🚀 Gupshup WhatsApp Bot running on port>>>>>> ${PORT}`);
  console.log("🤖 Chatbot URL:", CHATBOT_API_URL);
});


