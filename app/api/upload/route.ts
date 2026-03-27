import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { processPDF } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: '请上传PDF文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, message: '请上传PDF格式的文件' },
        { status: 400 }
      );
    }

    // 创建上传目录
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // 保存文件
    const filePath = join(uploadDir, 'book.pdf');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`✅ 文件已保存: ${filePath}`);

    // 处理PDF并构建向量库
    const result = await processPDF(filePath);

    return NextResponse.json(result);
  } catch (error) {
    console.error('上传错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '上传失败',
        chunks: 0 
      },
      { status: 500 }
    );
  }
}
