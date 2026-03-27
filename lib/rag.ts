import { OllamaEmbeddings } from "@langchain/ollama";
import { Ollama } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import * as fs from "fs";
import * as path from "path";

// 配置
const EMBEDDING_MODEL = "nomic-embed-text:latest";
const LLM_MODEL = "zen";

// 全局向量存储（实际生产环境应该使用持久化存储）
let vectorStore: MemoryVectorStore | null = null;
let isInitialized = false;

// 初始化嵌入模型
const embeddings = new OllamaEmbeddings({
  model: EMBEDDING_MODEL,
  baseUrl: "http://localhost:11434",
});

// 初始化大模型
const llm = new Ollama({
  model: LLM_MODEL,
  baseUrl: "http://localhost:11434",
});

/**
 * 处理PDF文件并构建向量库
 */
export async function processPDF(filePath: string): Promise<{ success: boolean; message: string; chunks: number }> {
  try {
    console.log("📖 正在加载 PDF...", filePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return { success: false, message: "文件不存在", chunks: 0 };
    }

    // 加载 PDF
    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();
    console.log(`✅ 加载完成，共 ${rawDocs.length} 页。`);

    // 文本切分
    console.log("✂️ 正在切分文本...");
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
    const splitDocs = await textSplitter.splitDocuments(rawDocs);
    console.log(`✅ 切分完成，共 ${splitDocs.length} 个片段。`);

    // 生成嵌入并存储到向量数据库
    console.log("🗄️ 正在生成向量并存入数据库...");
    vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    isInitialized = true;
    
    console.log("✅ 向量库构建完成！");
    
    return { 
      success: true, 
      message: "PDF处理成功", 
      chunks: splitDocs.length 
    };
  } catch (error) {
    console.error("❌ PDF处理错误:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "未知错误", 
      chunks: 0 
    };
  }
}

/**
 * 问答功能
 */
export async function askQuestion(question: string): Promise<{ 
  success: boolean; 
  answer: string; 
  sources?: string[];
  error?: string;
}> {
  try {
    if (!isInitialized || !vectorStore) {
      return { 
        success: false, 
        answer: "", 
        error: "请先上传PDF文档" 
      };
    }

    // 检索相关文档
    console.log("🔍 正在检索相关文档...");
    const relevantDocs = await vectorStore.similaritySearch(question, 3);
    
    if (relevantDocs.length === 0) {
      return { 
        success: true, 
        answer: "未在文档中找到相关信息。",
        sources: []
      };
    }

    // 构建上下文
    const contextContent = relevantDocs
      .map((doc) => doc.pageContent)
      .join("\n\n---\n\n");
    
    const sources = relevantDocs.map((doc, index) => 
      `片段 ${index + 1} (第${doc.metadata.loc?.pageNumber || '?'}页)`
    );

    // 构建 Prompt
    const prompt = `
你是一位专业的教学助手。请严格根据下面的【参考资料】回答教师的问题。
如果【参考资料】中没有答案，请直接说"根据提供的教材，我无法回答这个问题"，严禁编造。
回答要专业、准确、有条理，适合教师备课参考。

【参考资料】:
${contextContent}

教师问题: ${question}

回答:
    `;

    // 生成回答
    console.log("🤖 正在生成回答...");
    const response = await llm.invoke(prompt);
    
    return { 
      success: true, 
      answer: response,
      sources
    };
  } catch (error) {
    console.error("❌ 问答错误:", error);
    return { 
      success: false, 
      answer: "", 
      error: error instanceof Error ? error.message : "未知错误"
    };
  }
}

/**
 * 检查系统是否已初始化
 */
export function isSystemReady(): boolean {
  return isInitialized;
}
