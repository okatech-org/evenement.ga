import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Simple token protection (e.g. ?token=your-secret)
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  
  // Use AUTH_SECRET or any other existing secret as the diagnostic token
  const expectedToken = process.env.AUTH_SECRET || "diagnostic-secret";
  
  if (token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract relevant HTTP headers sent by the proxy
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Exclude sensitive cookies/authorization headers
    if (!key.toLowerCase().includes("cookie") && !key.toLowerCase().includes("authorization")) {
      headersObj[key] = value;
    }
  });

  const diagnosticData = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      AUTH_URL: process.env.AUTH_URL ? "[SET]" : "[MISSING]",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "[SET]" : "[MISSING]",
      AUTH_SECRET: process.env.AUTH_SECRET ? "[SET]" : "[MISSING]",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "[SET]" : "[MISSING]",
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ? "[SET]" : "[MISSING]",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 15) + "..." : "[MISSING]",
    },
    headersReceived: headersObj,
    urlVariables: {
      requestUrl: request.url,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(diagnosticData);
}
