import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All manuscript fields are required." },
        { status: 400 }
      );
    }

    // In a production setup, this would dispatch an email or integrate with a support system.
    console.log(`[MANUSCRIPT DISPATCH RECEIVED]`, { name, email, subject, message });

    return NextResponse.json(
      { success: true, message: "Your dispatch has been successfully recorded in our registry." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit your message." },
      { status: 500 }
    );
  }
}
