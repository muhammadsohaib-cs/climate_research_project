import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'climate.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Climate data file not found on server' },
        { status: 404 }
      );
    }
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('API /api/climate error:', error);
    return NextResponse.json(
      { error: 'Failed to read climate data', details: String(error) },
      { status: 500 }
    );
  }
}
