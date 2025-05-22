# Voice-Enabled Government Schemes Chatbot

An interactive voice-based chatbot that provides information about Indian government schemes. The chatbot uses speech recognition to understand user queries and responds with voice output in the user's preferred language.

## Features

- 🎙️ Voice input for questions
- 🤖 AI-powered responses based on government schemes data
- 🔊 Voice output in multiple Indian languages
- 📚 Knowledge base built from PDF documents
- 🔍 Semantic search for accurate answers

## Prerequisites

- Node.js (v14 or higher)
- Sox (for audio processing)
- OpenAI API key
- Sarvam AI API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gov-schemes
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
OPENAI_KEY=your_openai_api_key
SARVAM_API_KEY=your_sarvam_api_key
TARGET=en-IN
```

4. Place your government schemes PDF file as `schemes.pdf` in the root directory.

## Usage

Run the chatbot:
```bash
node chatbot.js
```

1. When prompted, speak your question about government schemes
2. The chatbot will process your voice input
3. Wait for the response, which will be played back in your language

## Technical Details

The chatbot uses several technologies:
- OpenAI's GPT-3.5 for generating responses
- LangChain for document processing and vector storage
- Sarvam AI for speech-to-text and text-to-speech
- PDF parsing for knowledge base creation

## Dependencies

- pdf-parse
- node-record-lpcm16
- axios
- form-data
- play-sound
- langchain
- openai
- dotenv

## Note

Make sure you have the following installed on your system:
- Sox audio processing tool
- Proper audio input/output devices configured

## License

[Add your license information here] 