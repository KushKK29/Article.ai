import { NextResponse } from "next/server";

// ponytail: in-memory rate limit map; upgrade to Redis if throughput requires
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(ip: string, email: string): string {
  return `${ip}:${email}`;
}

function checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxAttempts) {
    return false;
  }

  existing.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All manuscript fields are required." },
        { status: 400 }
      );
    }

    // Rate limiting: 5 submissions per hour per IP + email combo
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const key = getRateLimitKey(ip, email);

    if (!checkRateLimit(key)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again in an hour." },
        { status: 429 }
      );
    }

    // Call Python email service (hardcoded recipient, prevents relay attacks)
    const emailResponse = await fetch("http://localhost:8000/api/email/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: `[CONTACT] ${subject}`,
        body: `From: ${name}\n\n${message}`,
        reply_to: email
      })
    });

    if (!emailResponse.ok) {
      console.error("Email service error:", await emailResponse.text());
      return NextResponse.json(
        { error: "Failed to send dispatch. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Your dispatch has been successfully recorded in our registry." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit your message." },
      { status: 500 }
    );
  }
}
