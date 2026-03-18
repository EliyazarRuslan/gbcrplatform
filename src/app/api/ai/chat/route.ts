import { NextRequest } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

async function getFleetContext(): Promise<string> {
  try {
    const pool = await getMaxPool();
    const stats = await pool.request().query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut,
        SUM(CASE WHEN status = 'NOT READY' THEN 1 ELSE 0 END) as notReady,
        SUM(CASE WHEN status = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) as booked
      FROM asset WHERE siteid IN ('GBE','HAPL','MV') AND assetnum LIKE 'V%'
    `);
    const s = stats.recordset[0];
    return `Current fleet: ${s.total} total vehicles. ${s.hiredOut} hired out, ${s.notReady} not ready, ${s.idle} idle, ${s.booked} booked. Utilization: ${((s.hiredOut/s.total)*100).toFixed(1)}%.`;
  } catch {
    return 'Fleet data unavailable.';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const fleetContext = await getFleetContext();

    const systemPrompt = `You are an AI assistant for Goldbell Car Rental (GBCR) fleet management platform. You help with fleet analysis, booking optimization, maintenance planning, and cost reduction.

Live Fleet Data:
${fleetContext}

Provide concise, actionable insights. Use numbers and data when possible. Format with markdown.`;

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 1000,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error: unknown) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({ error: 'AI service unavailable' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
