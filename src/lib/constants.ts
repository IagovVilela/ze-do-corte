/** Vídeo institucional do hero (arquivo em `public/images/`). */
export const HERO_VIDEO_SRC = "/images/videoPrincipal.mp4";

/** Slogans oficiais da marca (usar no site e materiais). */
export const BARBER_SLOGAN_PRIMARY = "Estilo e confiança";
export const BARBER_SLOGAN_SECONDARY = "Experiências única para homens únicos";

/** Endereço físico da barbearia (contato e mapas). */
export const BARBER_SHOP_ADDRESS =
  "R. Laurent Martins, 209 - Jardim Esplanada, São José dos Campos - SP, 12242-431, Brasil";

/**
 * Fuso IANA dos gráficos do painel (`/admin`): buckets por dia/semana/hora seguem o calendário
 * local da barbearia, não o do servidor (ex.: UTC na Railway).
 */
export const BARBER_TIMEZONE = "America/Sao_Paulo";

/**
 * Horário de funcionamento (calendário completo — UI e referência para regras de agendamento).
 * Seg–sex: 09h–20h · Sábado: 09h–17h · Domingo: fechado.
 */
export const BARBER_WEEKLY_SCHEDULE: readonly { label: string; range: string }[] = [
  { label: "Segunda-feira", range: "09h — 20h" },
  { label: "Terça-feira", range: "09h — 20h" },
  { label: "Quarta-feira", range: "09h — 20h" },
  { label: "Quinta-feira", range: "09h — 20h" },
  { label: "Sexta-feira", range: "09h — 20h" },
  { label: "Sábado", range: "09h — 17h" },
  { label: "Domingo", range: "Fechado" },
] as const;

/** Hora de encerramento (fim do último atendimento possível = fechamento da loja). */
export const BARBER_CLOSE_WEEKDAY_HOUR = 20;
export const BARBER_CLOSE_SATURDAY_HOUR = 17;

/**
 * Links opcionais de contato. Deixe vazios para ocultar os botões na UI.
 *
 * - **whatsappHref**: link direto (ex. `api.whatsapp.com/message/...`). Se preenchido, tem prioridade sobre `whatsappDigits`.
 * - **whatsappDigits**: apenas dígitos com DDI, ex. `5512999999999` — usado em `wa.me` quando `whatsappHref` está vazio.
 * - **instagramHref**: URL completo do perfil no Instagram.
 * - **instagramUser**: nome de usuário do Instagram sem `@` (rótulo nos botões); usado só se `instagramHref` estiver vazio para montar `instagram.com/{user}`.
 */
export const BARBER_CONTACT_LINKS: {
  telHref: string;
  telLabel: string;
  whatsappHref: string;
  whatsappDigits: string;
  instagramHref: string;
  instagramUser: string;
} = {
  telHref: "",
  telLabel: "",
  whatsappHref:
    "https://api.whatsapp.com/message/PG2CKBFY6OYDP1?autoload=1&app_absent=0&utm_source=ig",
  whatsappDigits: "",
  instagramHref: "https://www.instagram.com/barbeariazedocorte.sjc/",
  instagramUser: "barbeariazedocorte.sjc",
};

export const BUSINESS_HOURS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
];
