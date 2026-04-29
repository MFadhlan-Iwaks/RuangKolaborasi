const { env } = require('../config/env');

function assertGeminiConfigured() {
  if (!env.geminiApiKey) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.status = 503;
    throw error;
  }
}

function extractGeminiText(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    const error = new Error('Gemini returned an empty response');
    error.status = 502;
    throw error;
  }

  return text;
}

async function generateText(prompt, options = {}) {
  assertGeminiConfigured();

  const model = options.model || env.geminiModel;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.geminiApiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxOutputTokens ?? 1024
      }
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || 'Gemini request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return extractGeminiText(payload);
}

async function polishMessage(text) {
  const prompt = [
    'Poles pesan berikut menjadi bahasa Indonesia yang lebih profesional, jelas, dan tetap natural.',
    'Jangan mengubah makna inti pesan.',
    'Jangan menambahkan sapaan atau konteks baru yang tidak ada.',
    'Balas hanya dengan versi pesan yang sudah dipoles.',
    '',
    `Pesan: ${text}`
  ].join('\n');

  return generateText(prompt, {
    temperature: 0.2,
    maxOutputTokens: 512
  });
}

async function summarizeDiscussion(messages) {
  const transcript = messages
    .map((message, index) => {
      const sender = message.senderName || 'Pengguna';
      const content = message.content || `[${message.type || 'non-text'}]`;
      return `${index + 1}. ${sender}: ${content}`;
    })
    .join('\n');

  const prompt = [
    'Buat rangkuman diskusi tim berikut dalam bahasa Indonesia.',
    'Fokus pada keputusan, progres, pertanyaan terbuka, dan tugas berikutnya.',
    'Gunakan format singkat dengan heading: Ringkasan, Keputusan, Tindak Lanjut.',
    '',
    'Transkrip:',
    transcript
  ].join('\n');

  return generateText(prompt, {
    temperature: 0.2,
    maxOutputTokens: 1200
  });
}

module.exports = {
  polishMessage,
  summarizeDiscussion
};
