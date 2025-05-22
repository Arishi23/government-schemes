const fs = require('fs');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const pdfBuffer = fs.readFileSync('./schemes.pdf');

async function run() {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const documents = await splitter.createDocuments([text]);
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey : process.env.OPENAI_KEY
  });

  const embeddedDocs = [];
  for (let doc of documents) {
    const result = await embeddings.embedQuery(doc.pageContent);
    embeddedDocs.push({
      content: doc.pageContent,
      embedding: result,
    });
  }

  fs.writeFileSync('embeddings.json', JSON.stringify(embeddedDocs));
  console.log(`✅ Saved ${embeddedDocs.length} embedded chunks to embeddings.json`);
}

run();