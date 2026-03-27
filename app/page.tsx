'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export default function Home() {
  const [isReady, setIsReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检查系统状态
  useEffect(() => {
    checkStatus();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setIsReady(data.ready);
    } catch (error) {
      console.error('检查状态失败:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus('请上传PDF格式的文件');
      return;
    }

    setIsUploading(true);
    setUploadStatus('正在上传和处理PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setIsReady(true);
        setUploadStatus(`✅ 上传成功！共处理 ${data.chunks} 个文本片段`);
      } else {
        setUploadStatus(`❌ ${data.message}`);
      }
    } catch (error) {
      setUploadStatus('❌ 上传失败，请重试');
      console.error('上传错误:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAsking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsAsking(true);
    setQuestion('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: userMessage.content }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.success ? data.answer : `错误: ${data.error}`,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '抱歉，处理您的问题时出现错误，请重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>📚 教师智能问答系统</h1>
        <p>基于RAG技术的教学辅助工具</p>
      </header>

      <div className={styles.container}>
        {/* 左侧：上传区域 */}
        <aside className={styles.sidebar}>
          <div className={styles.uploadSection}>
            <h2>📄 上传教材</h2>
            <div className={styles.uploadBox}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                id="pdf-upload"
                className={styles.fileInput}
              />
              <label htmlFor="pdf-upload" className={styles.uploadLabel}>
                {isUploading ? '⏳ 处理中...' : '📁 选择PDF文件'}
              </label>
            </div>
            {uploadStatus && (
              <div className={`${styles.status} ${uploadStatus.includes('✅') ? styles.success : uploadStatus.includes('❌') ? styles.error : styles.info}`}>
                {uploadStatus}
              </div>
            )}
          </div>

          <div className={styles.statusSection}>
            <h3>系统状态</h3>
            <div className={`${styles.badge} ${isReady ? styles.ready : styles.notReady}`}>
              {isReady ? '✅ 已就绪' : '⏳ 请上传PDF'}
            </div>
          </div>

          <div className={styles.tipsSection}>
            <h3>💡 使用提示</h3>
            <ul>
              <li>上传教材PDF文件</li>
              <li>等待系统处理完成</li>
              <li>输入问题获取答案</li>
              <li>答案基于教材内容</li>
            </ul>
          </div>
        </aside>

        {/* 右侧：问答区域 */}
        <section className={styles.chatSection}>
          <div className={styles.chatHeader}>
            <h2>💬 智能问答</h2>
            {messages.length > 0 && (
              <button onClick={clearChat} className={styles.clearBtn}>
                🗑️ 清空对话
              </button>
            )}
          </div>

          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🤖</div>
                <h3>开始对话</h3>
                <p>
                  {isReady
                    ? '请输入您关于教材的问题，AI助手将为您解答'
                    : '请先上传PDF教材文件，然后即可开始提问'}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.type === 'user' ? styles.userMessage : styles.aiMessage}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.avatar}>
                      {msg.type === 'user' ? '👨‍🏫' : '🤖'}
                    </span>
                    <span className={styles.role}>
                      {msg.type === 'user' ? '教师' : 'AI助手'}
                    </span>
                    <span className={styles.time}>
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className={styles.sources}>
                      <details>
                        <summary>📖 参考来源</summary>
                        <ul>
                          {msg.sources.map((source, idx) => (
                            <li key={idx}>{source}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isReady ? '输入您的问题...' : '请先上传PDF文件'}
              disabled={!isReady || isAsking}
              className={styles.input}
            />
            <button
              type="submit"
              disabled={!isReady || isAsking || !question.trim()}
              className={styles.sendBtn}
            >
              {isAsking ? '⏳' : '➤'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
