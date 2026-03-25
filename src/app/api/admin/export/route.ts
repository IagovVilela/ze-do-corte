import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        service: true,
      },
      orderBy: {
        startsAt: "asc",
      },
    });

    const rows = appointments.map((appointment) => ({
      Cliente: appointment.clientName,
      Telefone: appointment.clientPhone,
      Servico: appointment.service.name,
      DataHora: formatDateTime(appointment.startsAt),
      Status: appointment.status,
      Observacoes: appointment.notes ?? "",
      CriadoEm: formatDateTime(appointment.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agendamentos");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="agendamentos-ze-do-corte.xlsx"',
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Falha ao gerar exportacao de agendamentos." },
      { status: 500 },
    );
  }
}
