import { redirect } from "next/navigation";

/** Legacy mono-marca — redireciona para o tenant Zé do Corte. */
export default function LegacyBookingRedirect() {
  redirect("/ze-do-corte/agendar");
}
