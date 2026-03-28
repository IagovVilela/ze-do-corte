import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { unitNameMapByIds } from "@/lib/appointment-unit-names";
import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { staffLabelMapByIds } from "@/lib/staff-display-names";
import { appointmentScopeWhere } from "@/lib/staff-access";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireStaffApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }
  if (!authResult.access.permissions.exportData) {
    return NextResponse.json(
      { message: "Exportação não disponível para seu papel." },
      { status: 403 },
    );
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: appointmentScopeWhere(authResult.access),
      include: {
        service: true,
      },
      orderBy: {
        startsAt: "asc",
      },
    });

    const unitNames = await unitNameMapByIds(appointments.map((a) => a.unitId));
    const staffLabels = await staffLabelMapByIds(
      appointments.map((a) => a.staffMemberId),
    );

    const rows = appointments.map((appointment) => ({
      Cliente: appointment.clientName,
      Telefone: appointment.clientPhone,
      Servico: appointment.service.name,
      Unidade: appointment.unitId ? (unitNames.get(appointment.unitId) ?? "") : "",
      Profissional: appointment.staffMemberId
        ? (staffLabels.get(appointment.staffMemberId) ?? "")
        : "",
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
      { error: "Falha ao gerar exportação de agendamentos." },
      { status: 500 },
    );
  }
}
