import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

function buildPrompt(question: string) {
  return `You are a research gap analyst. Given a research question, identify 3-4 thematic clusters of what has been studied, and for each cluster clearly articulate what is missing or underexplored.

Return ONLY valid JSON with no preamble, no markdown fences, no explanation. Use this exact structure:
{
  "clusters": [
    {
      "theme": "What has been studied in this area (1-2 sentences)",
      "gap": "What is missing or underexplored and why (2-3 sentences grounded in what has been studied)",
      "confidence": "high | medium | low",
      "followup_question": "A specific, actionable research question targeting this gap"
    }
  ],
  "disclaimer": "Include this field only if the topic has very limited existing literature. Otherwise omit it."
}

Research question: ${question}`;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server misconfiguration: ANTHROPIC_API_KEY is not set." },
      { status: 500 }
    );
  }

  let question: unknown;
  try {
    const body = await request.json();
    question = body?.question;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof question !== "string" || question.trim().length === 0) {
    return Response.json(
      { error: "Please provide a research question." },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildPrompt(question.trim()),
        },
      ],
    });

    const block = message.content[0];
    const rawText = block && block.type === "text" ? block.text : "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(rawText));
    } catch {
      return Response.json(
        { error: "The analysis came back malformed. Please try again." },
        { status: 502 }
      );
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { clusters?: unknown }).clusters)
    ) {
      return Response.json(
        { error: "The analysis came back malformed. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("Anthropic API call failed:", err);
    return Response.json(
      { error: "Failed to reach the analysis service. Please try again." },
      { status: 502 }
    );
  }
}
