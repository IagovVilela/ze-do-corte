import { NextResponse } from "next/server";
import { getServicesForBooking } from "@/lib/data";

export async function GET() {
  try {
    const services = await getServicesForBooking();

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    return NextResponse.json(
      { message: "Erro interno ao buscar serviços." },
      { status: 500 },
    );
  }
}
