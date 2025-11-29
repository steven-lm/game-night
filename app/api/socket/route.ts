import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// This will be handled by a custom server setup
// For Next.js App Router, we need to use a different approach
export const dynamic = 'force-dynamic';

