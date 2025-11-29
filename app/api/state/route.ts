import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STATE_FILE = join(process.cwd(), 'data', 'state.json');

export async function GET() {
  try {
    if (existsSync(STATE_FILE)) {
      const data = readFileSync(STATE_FILE, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({ currentRound: 1, completedQuestions: [], teams: [] });
  } catch (error) {
    console.error('Error reading state:', error);
    return NextResponse.json({ error: 'Failed to read state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const state = await request.json();
    // Ensure directory exists
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    console.log('State saved to', STATE_FILE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing state:', error);
    return NextResponse.json({ error: 'Failed to write state', details: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (existsSync(STATE_FILE)) {
      writeFileSync(STATE_FILE, JSON.stringify({ currentRound: 1, completedQuestions: [], teams: [] }, null, 2), 'utf-8');
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing state:', error);
    return NextResponse.json({ error: 'Failed to clear state' }, { status: 500 });
  }
}

