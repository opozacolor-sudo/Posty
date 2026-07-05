import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";

function dataDeletionResponse(request: Request) {
  return NextResponse.json({
    url: `${getAppBaseUrl(request)}/en/privacy`,
    confirmation_code: "posty_threads_data_deletion",
  });
}

export async function GET(request: Request) {
  return dataDeletionResponse(request);
}

export async function POST(request: Request) {
  return dataDeletionResponse(request);
}
