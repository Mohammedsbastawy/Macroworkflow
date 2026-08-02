import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.error("=================== CLIENT-SIDE ERROR LOGGED ===================");
    console.error("User Agent:", request.headers.get("user-agent"));
    console.error("Message:", body.message);
    console.error("URL:", body.url);
    console.error("Line:", body.line, "Column:", body.column);
    console.error("Stack Trace:", body.stack);
    console.error("================================================================");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
