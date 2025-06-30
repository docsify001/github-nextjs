import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	console.log("GET", request.body);

	return NextResponse.json({ message: "ok" }, { status: 200 });
}

export async function POST(request: NextRequest) {
	const json = await request.json();

	console.log(json);

	if (!json) {
		return NextResponse.json({ error: "json not found" }, { status: 404 });
	}

	return NextResponse.json({ message: "ok" }, { status: 200 });
}


