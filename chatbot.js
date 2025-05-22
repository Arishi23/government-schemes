const fs = require('fs');
const pdfParse = require('pdf-parse');
const record = require('node-record-lpcm16');
const axios = require('axios');
const FormData = require('form-data');
const player = require('play-sound')();
require('dotenv').config();
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { Document } = require('langchain/document');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const SARVAM_KEY = process.env.SARVAM_API_KEY;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
let lang = process.env.TARGET;

const pdfBuffer = fs.readFileSync('./schemes.pdf');

async function createVectorStore() {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  console.clear();
  console.log("🤖 Please wait for sometime, I am reading through the knowledge base");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const documents = await splitter.createDocuments([text]);
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey : process.env.OPENAI_KEY
  });
  const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
  return vectorStore;
}

async function recordAudio() {
  console.clear();
  console.log("🎙️ Welcome! Ask me anything about Indian government schemes — I’ll listen and answer it out loud.");

  return new Promise((resolve) => {
    const recording = record.record({
      sampleRate: 16000,
      channels: 1,
      audioType: 'wav',
      verbose: false,
      threshold: 0,
      silence: 0,
      device: null,
      bitsPerSample: 16,
      endian: 'little'
    });

    const stream = recording.stream();
    const tempFile = 'temp_input.wav';
    const finalFile = 'input.wav';
    const file = fs.createWriteStream(tempFile, { encoding: 'binary' });
    
    stream.on('data', (chunk) => {
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
    });

    file.on('error', (err) => {
      console.error('File write error:', err);
    });

    stream.pipe(file);

    file.on('finish', async () => {
      try {
        // Use sox to convert the file to the correct format
        await execPromise(`sox ${tempFile} ${finalFile} rate 16000 channels 1 2>/dev/null`);
        const stats = fs.statSync(finalFile);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        resolve();
      } catch (error) {
        console.error('Error processing audio file:', error);
        resolve();
      }
    });

    setTimeout(() => {
      stream.end();
      file.end();
    }, 10000);
  });
}

async function transcribeAudio() {
  try {
    const fileStats = fs.statSync('input.wav');
    const fileContent = fs.readFileSync('input.wav');
    
    const form = new FormData();
    form.append('file', fs.createReadStream('input.wav'));
    form.append('model', 'saaras:flash');
    form.append('language_code', 'en-IN');
    form.append('with_timestamps', 'true');
    


    const response = await axios.post('https://api.sarvam.ai/speech-to-text-translate', form, {
      headers: {
        'api-subscription-key': SARVAM_KEY,
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    if (response.data.error) {
      console.error('API Error:', response.data.error);
      return null;
    }
    
    lang = response.data.language_code
    return response.data.transcript;
  } catch (error) {
    console.error('Error transcribing audio:', error.response?.data || error.message);
    return null;
  }
}

async function getAnswer(vectorStore, question) {
  const results = await vectorStore.similaritySearch(question, 3);
  const context = results.map(r => r.pageContent).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are an assistant answering questions about using only the provided context. Keep your response withtin 300 character ALONE. DONT EXCEED THE CHARACTER LIMIT \n\nContext:\n${context}`,
      },
      {
        role: 'user',
        content: question,
      },
    ],
    temperature: 0.2,
  });

  return response.choices[0].message.content;
}

async function speakAnswer(text) {

  const response = await axios.post(
    'https://api.sarvam.ai/translate',
    {
      "input": text,
      "source_language_code": "en-IN",
      "target_language_code": lang,
    },
    {
      headers: {
        'api-subscription-key': SARVAM_KEY,
        'Content-Type': 'application/json',
      },
    }
  );


  text = response.data.translated_text;

  const CHUNK_LIMIT = 3000;
  const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

  const splitIntoChunks = (text, limit) => {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > limit) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
  };

  const chunks = splitIntoChunks(text, CHUNK_LIMIT);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk || chunk.trim().length === 0) continue;
    const response = await axios.post(
      'https://api.sarvam.ai/text-to-speech',
      {
        text: chunk,
        target_language_code: lang,
        model: 'bulbul:v2',
        speaker: 'vidya',
      },
      {
        headers: {
          'api-subscription-key': SARVAM_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const audioBase64 = response.data.audios?.[0];
    if (!audioBase64) {
      console.warn('⚠️ Empty audio chunk. Skipping...');
      continue;
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const outputPath = `output_${i}.wav`;
    fs.writeFileSync(outputPath, buffer);

    // Play the chunk immediately
    player.play(outputPath, err => {
      if (err) console.error('❌ Audio playback failed:', err.message);
      fs.unlinkSync(outputPath); // Clean up after playback
    });
  }
}

(async () => {
  const vectorStore = await createVectorStore();
  let status = true;
  while (status) {
    await recordAudio();
    const question = await transcribeAudio();
    console.log(`\n📝 You asked: ${question}`);
    console.log("Gathering the Answer");
    const answer = await getAnswer(vectorStore, question);
    console.log(`\n🤖 Answer: ${answer}`);
    await speakAnswer(answer);
    status = false;
  }
})();