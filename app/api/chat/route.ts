import { NextRequest, NextResponse } from 'next/server';
import { askQuestion, isSystemReady } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    // 检查系统是否已初始化
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: '请输入有效的问题',
          answer: '' 
        },
        { status: 400 }
      );
    }

    // 处理问题
    const result = await askQuestion(question);

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('问答错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        answer: '', 
        error: error instanceof Error ? error.message : '处理失败' 
      },
      { status: 500 }
    );
  }
}
