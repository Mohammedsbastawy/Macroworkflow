import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function POST(req: NextRequest) {
  try {
    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileId = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save actual file
    fs.writeFileSync(path.join(UPLOAD_DIR, fileId), buffer);

    // Save metadata
    const metadata = {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    };
    fs.writeFileSync(path.join(UPLOAD_DIR, `${fileId}.json`), JSON.stringify(metadata, null, 2), 'utf-8');

    // Return database-style payload
    return NextResponse.json({
      data: {
        id: fileId,
        filename_download: file.name,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

