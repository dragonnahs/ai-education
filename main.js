import { OllamaEmbeddings } from "@langchain/ollama";
import { Ollama } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { MemoryVectorStore } from "langchain/vectorstores/memory"; // 备用：如果不想装本地 Chroma 服务
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// 处理 __dirname (ES Module 兼容性)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const PDF_PATH = path.join(__dirname, "book.pdf");
const COLLECTION_NAME = "my_book_collection";
const EMBEDDING_MODEL = "nomic-embed-text:latest";
const LLM_MODEL = "llama3.2:1b";

async function main() {
  console.log("🚀 启动 Node.js RAG 演示...\n");

  // 1. 检查文件是否存在
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ 错误: 找不到文件 ${PDF_PATH}`);
    return;
  }

  // 2. 加载 PDF
  console.log("📖 正在加载 PDF...");
  const loader = new PDFLoader(PDF_PATH);
  const rawDocs = await loader.load();
  console.log(`✅ 加载完成，共 ${rawDocs.length} 页。`);

  // 3. 文本切分 (Chunking)
  // 将长文档切分成小块，以便向量搜索更精准
  console.log("✂️ 正在切分文本...");
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500, // 每块 500 字符
    chunkOverlap: 50, // 重叠 50 字符，保持上下文连贯
  });
  const splitDocs = await textSplitter.splitDocuments(rawDocs);
  console.log(`✅ 切分完成，共 ${splitDocs.length} 个片段。`);

  // 4. 生成嵌入并存储到向量数据库
  console.log("🗄️ 正在生成向量并存入数据库 (首次运行较慢)...");
  
  // 初始化嵌入模型 (连接本地 Ollama)
  const embeddings = new OllamaEmbeddings({
    model: EMBEDDING_MODEL,
    baseUrl: "http://localhost:11434", 
  });

  // 初始化向量数据库 (这里使用内存版演示，生产环境请改用持久化 Chroma)
  // 如果要使用本地运行的 ChromaDB 服务，请使用: new Chroma(embeddings, { collectionName: COLLECTION_NAME })
  const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  
  console.log("✅ 向量库构建完成！\n");

  // 5. 交互式问答循环
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 初始化大模型
  const llm = new Ollama({
    model: LLM_MODEL,
    baseUrl: "http://localhost:11434",
  });

  console.log("💬 现在可以提问了 (输入 'quit' 退出):");

  const askQuestion = () => {
    rl.question("\n你: ", async (userQuery) => {
      if (userQuery.toLowerCase() === "quit" || userQuery.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        // A. 检索相关文档 (Retrieval)
        // 将用户问题向量化，并在数据库中查找最相似的 3 个片段
        const relevantDocs = await vectorStore.similaritySearch(userQuery, 3);
        
        if (relevantDocs.length === 0) {
          console.log("AI: ❌ 未在文档中找到相关信息。");
          askQuestion();
          return;
        }

        // B. 构建上下文 (Context)
        const contextContent = relevantDocs
          .map((doc) => doc.pageContent)
          .join("\n\n---\n\n");

        // C. 构建 Prompt (RAG 核心)
        const prompt = `
        你是一个专业的教育助手。请严格根据下面的【参考资料】回答用户的问题。
        如果【参考资料】中没有答案，请直接说“根据提供的文档，我无法回答这个问题”，严禁编造。

        【参考资料】:
        ${contextContent}

        用户问题: ${userQuery}
        
        回答:
        `;

        // D. 生成回答 (Generation)
        console.log("🤖 正在思考...");
        const response = await llm.invoke(prompt);
        
        console.log(`AI: ${response}`);
        
      } catch (error) {
        console.error("❌ 发生错误:", error.message);
      }

      askQuestion(); // 继续下一轮提问
    });
  };

  askQuestion();
}

// 运行主程序
main().catch(console.error);