import { redirect } from "next/navigation";

/** Legacy mono-marca — redireciona para a vitrine demo Barbergon (`/ze-do-corte`). */
export default function LegacyBookingRedirect() {
  redirect("/ze-do-corte/agendar");
}
