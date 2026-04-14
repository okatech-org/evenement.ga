import { NextResponse } from "next/server";

// Temporary debug endpoint to test OAuth callback behavior
// This endpoint tries to call the auth callback internally and captures any errors
export async function GET() {
  try {
    // Try importing auth to see if it throws
    const authModule = await import("@/lib/auth");
    
    // Check if we can access the auth function
    const session = await authModule.auth();
    
    return NextResponse.json({
      status: "ok",
      hasSession: !!session,
      sessionUser: session?.user?.email ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({
      status: "error",
      message: err.message,
      name: err.name,
      stack: err.stack?.split("\n").slice(0, 10),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
