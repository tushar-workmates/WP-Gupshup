// import express from "express";
// import axios from "axios";
// import { OpenAI } from "openai";
// import "dotenv/config";

// const app = express();
// app.use(express.json());

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
// const SOURCE = "918093076364";

// app.post("/webhook", async (req, res) => {
//   console.log("Incoming Webhook:", JSON.stringify(req.body, null, 2));

//   try {
//     // Check if this is a message webhook (not a status update)
//     const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    
//     if (!value) {
//       console.log("ℹEmpty or invalid webhook");
//       return res.sendStatus(200);
//     }

//     // Check if this is a status update
//     if (value.statuses && Array.isArray(value.statuses)) {
//       const status = value.statuses[0];
//       console.log(`Status Update: ${status.status} for message ${status.gs_id} to ${status.recipient_id}`);
//       return res.sendStatus(200);
//     }

//     // Check if this is a message webhook
//     if (!value.messages || !Array.isArray(value.messages)) {
//       console.log("Not a message webhook (could be other event type)");
//       return res.sendStatus(200);
//     }

//     // Extract message and phone
//     let message = "";
//     let userPhone = "";

//     const firstMessage = value.messages[0];

//     // Handle different message types
//     switch (firstMessage.type) {
//       case "text":
//         message = firstMessage.text?.body || "";
//         break;
//       case "image":
//         message = "[Image received]";
//         break;
//       case "audio":
//         message = "[Audio message received]";
//         break;
//       case "video":
//         message = "[Video message received]";
//         break;
//       case "document":
//         message = "[Document received]";
//         break;
//       default:
//         console.log(`ℹ️ Unhandled message type: ${firstMessage.type}`);
//         return res.sendStatus(200);
//     }

//     userPhone = firstMessage.from;

//     console.log("Extracted message:", message);
//     console.log("From phone:", userPhone);

//     if (!message || !userPhone) {
//       console.log(" No message or phone found in valid message webhook.");
//       return res.sendStatus(200);
//     }

//     // Skip if it's just an image placeholder and you don't want to respond to images
//     if (message === "[Image received]") {
//       console.log("Image received, sending canned response");
//       // You can customize the response for images
//       const reply = "I'm unable to view images. However, if you can describe the content or provide information about it, I'd be happy to help!";
      
//       await sendWhatsAppMessage(userPhone, reply);
//       return res.sendStatus(200);
//     }

//     // Send to OpenAI
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "You are a helpful WhatsApp assistant." },
//         { role: "user", content: message }
//       ],
//     });

//     const reply = completion.choices[0].message.content;

//     console.log("AI Reply:", reply);

//     // Send reply to WhatsApp
//     await sendWhatsAppMessage(userPhone, reply);

//     res.sendStatus(200);
//   } catch (err) {
//     console.error("ERROR:", err);
//     res.sendStatus(500);
//   }
// });

// // Helper function to send WhatsApp messages
// async function sendWhatsAppMessage(destination, text) {
//   try {
//     const result = await axios.post(
//       "https://api.gupshup.io/sm/api/v1/msg",
//       new URLSearchParams({
//         channel: "whatsapp",
//         source: SOURCE,
//         destination: destination,
//         "message.type": "text",
//         "message.text": text,
//       }),
//       {
//         headers: {
//           apikey: GUPSHUP_API_KEY,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     console.log("📤 Gupshup Response:", result.data);
//     return result.data;
//   } catch (error) {
//     console.error("Error sending WhatsApp message:", error.response?.data || error.message);
//     throw error;
//   }
// }

// app.listen(5000, () =>
//   console.log("Gupshup WhatsApp Bot running on port 5000")
// );









// import express from "express";
// import axios from "axios";
// import "dotenv/config";

// const app = express();
// app.use(express.json());

// // ================== CONFIG ==================
// const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
// const CHATBOT_API_URL = process.env.CHATBOT_API_URL;
// const SOURCE = "918093076364";

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

//     // ---------- TEXT ONLY ----------
//     if (msg.type !== "text") {
//       await sendWhatsAppMessage(
//         userPhone,
//         "Please send a text message so I can help 🙂"
//       );
//       return res.sendStatus(200);
//     }

//     const userMessage = msg.text?.body?.trim();
//     if (!userMessage) return res.sendStatus(200);

//     console.log("💬 User:", userPhone);
//     console.log("📝 Message:", userMessage);

//     // ACK EARLY
//     res.sendStatus(200);

//     // ---------- SESSION LOGIC ----------
//     const existingSessionId = sessionStore.get(userPhone);

//     const payload = existingSessionId
//       ? { message: userMessage, session_id: existingSessionId }
//       : { message: userMessage };

//     console.log(
//       existingSessionId
//         ? `🔁 Using session ${existingSessionId}`
//         : "🆕 Creating new session"
//     );

//     // ---------- CALL CHATBOT ----------
//     const chatbotResponse = await axios.post(
//       CHATBOT_API_URL,
//       payload,
//       {
//         headers: { "Content-Type": "application/json" },
//         timeout: 20000
//       }
//     );

//     console.log(
//       "🧠 Chatbot raw response:",
//       JSON.stringify(chatbotResponse.data, null, 2)
//     );

//     const data = chatbotResponse.data || {};

//     // ---------- ✅ CORRECT REPLY EXTRACTION ----------
//     let reply =
//       data.answer ||        // ✅ YOUR CHATBOT USES THIS
//       data.message ||
//       data.reply ||
//       data.text ||
//       "Sorry, I couldn't understand that.";

//     // ---------- STORE SESSION ID ----------
//     if (!existingSessionId && data.session_id) {
//       sessionStore.set(userPhone, data.session_id);
//       console.log("✅ Session stored:", data.session_id);
//     }

//     console.log("🤖 Final reply sent to WhatsApp:", reply);

//     // ---------- SEND TO WHATSAPP ----------
//     await sendWhatsAppMessage(userPhone, reply);

//   } catch (err) {
//     console.error("❌ ERROR:", err.response?.data || err.message);
//   }
// });

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
// app.listen(5000, () => {
//   console.log("🚀 Gupshup WhatsApp Bot running on port 5000");
//   console.log("🤖 Chatbot URL:", CHATBOT_API_URL);
// });









import express from "express";
import axios from "axios";
import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const app = express();

// 🔒 Safe body parser (does NOT affect text)
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
      { headers: { "Content-Type": "application/json" }, timeout: 20000 }
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
async function whisperFromUrl(audioUrl) {
  // 1️⃣ Download audio to temp file
  const tmpPath = path.join(
    "/tmp",
    `voice_${Date.now()}.ogg`
  );

  const audioResp = await axios.get(audioUrl, { responseType: "stream" });
  const writer = fs.createWriteStream(tmpPath);
  audioResp.data.pipe(writer);

  await new Promise(resolve => writer.on("finish", resolve));

  // 2️⃣ Send file stream to Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(tmpPath), // ✅ REQUIRED
    model: "whisper-1"
  });

  // 3️⃣ Cleanup
  fs.unlink(tmpPath, () => {});

  return transcription.text.trim();
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

