import { NextResponse } from "next/server";
import { getServices } from "@/lib/data";

export async function GET() {
  try {
    const services = await getServices();

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    return NextResponse.json(
      { message: "Erro interno ao buscar serviços." },
      { status: 500 },
    );
  }
}
