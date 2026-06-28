import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    url: "https://posty-ashen.vercel.app/ro/privacy",
    confirmation_code: "posty_threads_data_deletion",
  });
}

export async function POST() {
  return NextResponse.json({
    url: "https://posty-ashen.vercel.app/ro/privacy",
    confirmation_code: "posty_threads_data_deletion",
  });
}
