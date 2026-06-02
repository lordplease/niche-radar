import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const payload = {
      model: body.model || "claude-sonnet-4-6",
      max_tokens: body.max_tokens || 4096,
      messages: body.messages,
    };
    if (body.system) payload.system = body.system;
    if (body.tools) payload.tools = body.tools;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}