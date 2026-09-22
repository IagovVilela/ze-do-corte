#!/usr/bin/env python3
"""
Vaga Perdida — PDF 2 pilares + virada (layout estável + conteúdo denso).

Correções:
- badge de pilar com folga real abaixo (sem cortar título)
- textos menos óbvios: mecanismo, números, regras operacionais
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image as PILImage
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path("/workspace")
SHOTS = ROOT / "docs/infoprodutos/screenshots"
OUT = ROOT / "docs/infoprodutos/vaga-perdida-barbernegon.pdf"
OUT2 = ROOT / "docs/infoprodutos/vaga-perdida-produto.pdf"
ARTIFACT = Path("/opt/cursor/artifacts/infoprodutos/vaga-perdida-barbernegon.pdf")

URL_HOME = "https://barbernegon-production.up.railway.app/"
URL_CADASTRO = "https://barbernegon-production.up.railway.app/cadastro"
URL_LOGIN = "https://barbernegon-production.up.railway.app/admin/login"
URL_PILOTO = "https://barbernegon-production.up.railway.app/ze-do-corte"

BG = (0x0A / 255, 0x0E / 255, 0x13 / 255)
SURF = (0x12 / 255, 0x18 / 255, 0x22 / 255)
ELEV = (0x18 / 255, 0x21 / 255, 0x2E / 255)
FIELD = (0x1A / 255, 0x24 / 255, 0x33 / 255)
LINE = (0x3A / 255, 0x4A / 255, 0x60 / 255)
FG = (0xE8 / 255, 0xEE / 255, 0xF6 / 255)
MUTED = (0xB0 / 255, 0xBC / 255, 0xCE / 255)
BLUE = (0x3B / 255, 0x82 / 255, 0xF6 / 255)
SOFT = (0x8E / 255, 0xB6 / 255, 0xFF / 255)
OK = (0x34 / 255, 0xD3 / 255, 0x99 / 255)
WARN = (0xF5 / 255, 0x9E / 255, 0x0B / 255)

W, H = A4
M = 16 * mm
FOOTER = 16 * mm
CONTENT_BOTTOM = FOOTER + 4 * mm


def fonts():
    reg = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    bold = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    if reg.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("VP", str(reg)))
        pdfmetrics.registerFont(TTFont("VPB", str(bold)))
        return "VP", "VPB"
    return "Helvetica", "Helvetica-Bold"


F, FB = fonts()


class Book:
    def __init__(self):
        self.buf = BytesIO()
        self.c = canvas.Canvas(self.buf, pagesize=A4)
        self.n = 0

    def page(self):
        if self.n:
            self.c.showPage()
        self.n += 1
        c = self.c
        c.setFillColorRGB(*BG)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColorRGB(*BLUE)
        c.rect(0, H - 2.2 * mm, W, 2.2 * mm, fill=1, stroke=0)
        return H - 16 * mm

    def save(self):
        self.c.save()
        self.buf.seek(0)
        reader = PdfReader(self.buf)
        writer = PdfWriter()
        total = len(reader.pages)
        for i, page in enumerate(reader.pages, start=1):
            packet = BytesIO()
            ov = canvas.Canvas(packet, pagesize=A4)
            ov.setFillColorRGB(*MUTED)
            ov.setFont(F, 7.5)
            ov.drawString(M, 7 * mm, "Barbernegon · Vaga Perdida")
            ov.drawRightString(W - M, 7 * mm, f"{i} / {total}")
            ov.save()
            packet.seek(0)
            page.merge_page(PdfReader(packet).pages[0])
            writer.add_page(page)
        data = BytesIO()
        writer.write(data)
        raw = data.getvalue()
        for path in (OUT, OUT2, ARTIFACT):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        print(f"PDF OK pages={total} bytes={len(raw)} → {OUT}")


def wrap(c, text, x, y, max_w, font, size, leading, color=MUTED, center=False):
    c.setFillColorRGB(*color)
    c.setFont(font, size)
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if c.stringWidth(t, font, size) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for line in lines:
        if center:
            c.drawCentredString(x + max_w / 2, y, line)
        else:
            c.drawString(x, y, line)
        y -= leading
    return y


def topbar(c, text):
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 7.5)
    c.drawString(M, H - 10 * mm, text.upper())


def h1(c, text, y, size=18):
    # leading generoso para não colidir com bloco de cima
    return wrap(c, text, M, y, W - 2 * M, FB, size, size + 5, FG)


def p(c, text, y, size=10):
    return wrap(c, text, M, y, W - 2 * M, F, size, size + 4.5, MUTED)


def card(c, x, y, w, h, fill=ELEV, stroke=LINE, sw=1):
    c.setFillColorRGB(*fill)
    c.setStrokeColorRGB(*stroke)
    c.setLineWidth(sw)
    c.roundRect(x, y, w, h, 3.5, fill=1, stroke=1)


def bullet(c, y, text, size=9.5):
    c.setFillColorRGB(*BLUE)
    c.circle(M + 1.6 * mm, y + 1.1 * mm, 1.3 * mm, fill=1, stroke=0)
    return wrap(c, text, M + 5.5 * mm, y, W - 2 * M - 5.5 * mm, F, size, size + 3.5, FG)


def num_step(c, y, n, title, body):
    c.setFillColorRGB(*BLUE)
    c.setFont(FB, 12)
    c.drawString(M, y, str(n))
    c.setFillColorRGB(*FG)
    c.setFont(FB, 11)
    c.drawString(M + 10 * mm, y, title)
    y -= 5 * mm
    return wrap(c, body, M + 10 * mm, y, W - 2 * M - 10 * mm, F, 9, 12, MUTED)


def shot(c, name, y_top, caption, max_h=62 * mm):
    path = SHOTS / name
    if not path.exists():
        return y_top - 6 * mm
    # não invadir rodapé
    max_h = min(max_h, y_top - CONTENT_BOTTOM - 10 * mm)
    if max_h < 28 * mm:
        return y_top
    im = PILImage.open(path)
    iw, ih = im.size
    max_w = W - 2 * M
    scale = min(max_w / iw, max_h / ih)
    dw, dh = iw * scale, ih * scale
    x = M + (max_w - dw) / 2
    y = y_top - dh
    pad = 1.5 * mm
    c.setFillColorRGB(*LINE)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 2.5, fill=1, stroke=0)
    c.setStrokeColorRGB(*BLUE)
    c.setLineWidth(0.9)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 2.5, fill=0, stroke=1)
    c.drawImage(ImageReader(path), x, y, width=dw, height=dh, mask="auto")
    return wrap(c, caption, M, y - 4 * mm, max_w, F, 7.5, 9.5, MUTED, True)


def url_box(c, y, label, url):
    h = 13 * mm
    card(c, M, y - h, W - 2 * M, h, FIELD, BLUE, 1.1)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 7)
    c.drawString(M + 3 * mm, y - 4 * mm, label)
    wrap(c, url, M + 3 * mm, y - 9 * mm, W - 2 * M - 6 * mm, F, 7.5, 9.5, FG)
    return y - h - 3.5 * mm


def pillar_badge(c, y, text, color=BLUE):
    """
    Badge + FOLGA OBRIGATÓRIA abaixo.
    O título seguinte NÃO pode começar colado na borda.
    """
    bh = 9 * mm
    card(c, M, y - bh, W - 2 * M, bh, ELEV, color, 1.1)
    c.setFillColorRGB(*color)
    c.setFont(FB, 8)
    c.drawCentredString(W / 2, y - bh / 2 - 1.2 * mm, text)
    # 9mm box + 8mm gap = 17mm total
    return y - bh - 8 * mm


def callout(c, y, label, body, color=BLUE, h=28 * mm):
    card(c, M, y - h, W - 2 * M, h, ELEV, color, 1.2)
    c.setFillColorRGB(*color)
    c.setFont(FB, 7.5)
    c.drawString(M + 3.5 * mm, y - 5.5 * mm, label)
    wrap(c, body, M + 3.5 * mm, y - 11 * mm, W - 2 * M - 7 * mm, F, 9, 12, FG)
    return y - h - 4 * mm


def build():
    b = Book()
    c = b.c

    # —— 1 CAPA ——
    y = b.page()
    topbar(c, "Guia Barbernegon · R$ 19,90 · 2 pilares")
    y = H - 28 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 32)
    c.drawString(M, y, "Vaga Perdida")
    y -= 11 * mm
    y = p(
        c,
        "WhatsApp cheio não significa cadeira cheia. Este guia mostra o buraco escondido na agenda — e como fechar com método + sistema.",
        y,
        11,
    )
    y -= 6 * mm
    c.setFillColorRGB(*BLUE)
    c.rect(M, y, 20 * mm, 1.1 * mm, fill=1, stroke=0)
    y -= 8 * mm
    y = callout(
        c,
        y,
        "O QUE NINGUÉM CONTA",
        "Uma casa pode atender “bem” e ainda assim queimar 15–25% da capacidade em no-show, cancelamento sem reposição e horários que ninguém oferece no chat. O prejuízo parece “semana fraca”. Na prática é vazão.",
        BLUE,
        32 * mm,
    )
    y -= 2 * mm
    for t in [
        "Pilar 1 — Método no braço: medir, fechar buracos, regras e scripts.",
        "Virada — Por que isso cansa quando você vive dentro do salão.",
        "Pilar 2 — Como o Barbernegon executa isso (e como você entra).",
    ]:
        y = bullet(c, y, t)
        y -= 1.5 * mm

    # —— 2 PROBLEMA NÃO ÓBVIO ——
    y = b.page()
    topbar(c, "O diagnóstico que a maioria erra")
    y = h1(c, "Seu WhatsApp ocupado é uma métrica falsa", y)
    y -= 3 * mm
    y = p(
        c,
        "Mensagem o dia inteiro parece demanda alta. Muitas vezes é só atrito: gente pedindo horário que você já passou, remarcando em cima da hora, ou “só olhando”. Enquanto isso, a cadeira fica fria em faixas que ninguém enxerga.",
        y,
    )
    y -= 4 * mm
    y = p(
        c,
        "Vaga perdida não é só “cliente faltou”. É qualquer slot que poderia ter virado atendimento pago e não virou — porque a operação não recolocou alguém a tempo, ou porque a oferta de horário nunca ficou clara.",
        y,
    )
    y -= 5 * mm
    y = callout(
        c,
        y,
        "CUSTO REAL DO NO-SHOW",
        "Não é só o valor do corte perdido. É o horário que você recusou ontem para “guardar” esse cliente — e o espaço que sobrou hoje sem lista de encaixe. Um no-show sem reposição custa o ticket + a oportunidade que você já tinha matado.",
        WARN,
        34 * mm,
    )
    y -= 2 * mm
    y = h1(c, "Para quem este guia serve de verdade", y, 15)
    y -= 3 * mm
    for t in [
        "1 unidade, poucos barbeiros, agenda ainda no WhatsApp.",
        "Sente a casa “andando”, mas o caixa da semana não fecha como deveria.",
        "Já tentou “organizar melhor” e voltou ao improviso em 48h.",
    ]:
        y = bullet(c, y, t)
        y -= 1.5 * mm

    # —— 3 PILAR 1 MEDIR ——
    y = b.page()
    topbar(c, "Pilar 1 · método convencional")
    y = pillar_badge(c, y, "PILAR 1 — MÉTODO NO BRAÇO")
    y = h1(c, "Meça a capacidade queimada (não o feeling)", y)
    y -= 3 * mm
    y = p(
        c,
        "Escolha uma semana fechada. Ignore “achismo de movimento”. Use só o que aconteceu de fato.",
        y,
    )
    y -= 4 * mm
    for n, t, d in [
        (
            "1",
            "Capacidade (A)",
            "Some os slots vendáveis do expediente (desconte almoço, folga, bloqueio). Se o corte é 40 min, não conte “horas” — conte slots reais.",
        ),
        (
            "2",
            "Atendidos (T)",
            "Só quem sentou e concluiu. Confirmado que não veio não conta. Cancelado sem reposição não conta.",
        ),
        (
            "3",
            "Ticket de referência",
            "Use o serviço que mais vende (não a média sonhada). Se 70% é corte, use o preço do corte.",
        ),
    ]:
        y = num_step(c, y, n, t, d)
        y -= 4 * mm
    y -= 1 * mm
    y = callout(
        c,
        y,
        "FÓRMULA",
        "Slots vazios = A − T.  Dinheiro na mesa = (A − T) × ticket.  Ex.: A=48 · T=37 · ticket R$ 70 → 11 slots · R$ 770 na semana. Em 4 semanas, isso vira quase um aluguel.",
        BLUE,
        30 * mm,
    )
    y -= 2 * mm
    y = p(
        c,
        "Se o número doer, bom. É ele que justifica mudar regra — não discurso motivacional.",
        y,
        9.5,
    )

    # —— 4 PILAR 1 BURACOS ——
    y = b.page()
    topbar(c, "Pilar 1 · mecanismos")
    y = pillar_badge(c, y, "PILAR 1 — POR QUE A VAGA SOME DE VERDADE")
    y = h1(c, "Cinco mecanismos (não slogans)", y)
    y -= 3 * mm
    leaks = [
        (
            "1. Confirmação fraca",
            "Sem regra de prazo, o “ok” no chat não é compromisso. O cliente trata como intenção. Você trata como reserva. Choque = cadeira vazia.",
        ),
        (
            "2. Sem reposição em até 60–90 min",
            "Cancelamento de manhã sem lista pronta vira buraco até o fim do turno. Depois das 11h, a chance de encaixe despenca.",
        ),
        (
            "3. Inventário invisível no WhatsApp",
            "Você não “mostra” os horários livres; responde um a um. Enquanto digita, o cliente já perguntou em outro salão.",
        ),
        (
            "4. Demanda alugada",
            "Marketplace traz visita, não hábito. O cliente compara preço ao lado. Você paga com margem e com a marca diluída.",
        ),
        (
            "5. Compromisso sem âncora",
            "Sem página da casa + horário marcado no mesmo lugar, o compromisso fica frágil. Falta sobe quando a marcação parece “conversa”.",
        ),
    ]
    for title, desc in leaks:
        card(c, M, y - 22 * mm, W - 2 * M, 21 * mm, ELEV)
        c.setFillColorRGB(*FG)
        c.setFont(FB, 9.5)
        c.drawString(M + 3.5 * mm, y - 6 * mm, title)
        wrap(c, desc, M + 3.5 * mm, y - 11.5 * mm, W - 2 * M - 7 * mm, F, 8, 10.5, MUTED)
        y -= 24 * mm

    # —— 5 PILAR 1 MÉTODO ——
    y = b.page()
    topbar(c, "Pilar 1 · operação")
    y = pillar_badge(c, y, "PILAR 1 — REGRAS QUE SEGURAM A CADEIRA")
    y = h1(c, "O que fazer (com precisão)", y)
    y -= 3 * mm
    for n, t, d in [
        (
            "A",
            "Oferta de horário com inventário",
            "Publique só o que existe. Separe serviço longo de curto. Reserve 1–2 slots/dia só para encaixe — se não usar até X horas antes, libera.",
        ),
        (
            "B",
            "Confirmação com prazo",
            "Na marcação: pedir 1/2. Na véspera (ex.: 18h): lembrete. Sem resposta até o prazo → libera para a lista. Sem drama; com regra.",
        ),
        (
            "C",
            "Lista de reposição segmentada",
            "Não é “clientes em geral”. São 10–20 nomes flexíveis por faixa (manhã / tarde) e por serviço. Cancelou → dispara em ordem, não no grupo.",
        ),
        (
            "D",
            "Canal de marcação separado do papo",
            "WhatsApp para relacionamento. Marcação num fluxo único (link). Senão você mistura orçamento, atraso e reserva na mesma conversa.",
        ),
    ]:
        y = num_step(c, y, n, t, d)
        y -= 4 * mm
    y -= 1 * mm
    y = callout(
        c,
        y,
        "POLÍTICA ANTI FALTA (CURTA)",
        "2 faltas seguidas sem aviso = próximo horário só em faixa menos nobre (ou sinal simbólico). Avise na primeira marcação. Regra dita depois da briga não cola.",
        WARN,
        28 * mm,
    )

    # —— 6 PILAR 1 SCRIPTS ——
    y = b.page()
    topbar(c, "Pilar 1 · scripts")
    y = pillar_badge(c, y, "PILAR 1 — TEXTOS QUE CRIAM COMPROMISSO")
    y = h1(c, "Três mensagens com função operacional", y)
    y -= 3 * mm
    y = p(
        c,
        "Não são “mensagens bonitinhas”. Cada uma fecha um vazamento: confirmação, proteção da véspera e reposição rápida.",
        y,
    )
    y -= 4 * mm
    scripts = [
        (
            "MARCAÇÃO (cria compromisso)",
            "Fala, [Nome]! Horário na [Barbearia]: [dia] às [hora] — [serviço]. Responde 1 para confirmar ou 2 para remarcar até [prazo]. Sem resposta, libero a vaga.",
        ),
        (
            "VÉSPERA (protege o dia)",
            "[Nome], amanhã às [hora] te esperamos. Se não puder, avisa até [limite] — tenho fila de encaixe. Depois disso a vaga pode ir para outra pessoa.",
        ),
        (
            "ENCAIXE (recupera slot)",
            "Abriu [serviço] hoje às [hora] na [Barbearia]. É encaixe. Quer? Responde AGORA (tenho mais 2 pessoas na fila).",
        ),
    ]
    for lab, txt in scripts:
        h = 28 * mm
        card(c, M, y - h, W - 2 * M, h, ELEV)
        c.setFillColorRGB(*BLUE)
        c.setFont(FB, 7.5)
        c.drawString(M + 3.5 * mm, y - 5.5 * mm, lab)
        wrap(c, txt, M + 3.5 * mm, y - 11 * mm, W - 2 * M - 7 * mm, F, 8.5, 11, FG)
        y -= h + 3.5 * mm
    y -= 1 * mm
    y = p(
        c,
        "Detalhe que muda resultado: mencionar prazo e fila. O cliente entende que a vaga tem valor — não é favor eterno.",
        y,
        9.5,
    )

    # —— 7 VIRADA ——
    y = b.page()
    topbar(c, "Virada")
    y = pillar_badge(c, y, "VIRADA — ONDE O MÉTODO ENCONTRA O LIMITE", WARN)
    y = h1(c, "O método do Pilar 1 funciona. O gargalo é você.", y)
    y -= 3 * mm
    y = p(
        c,
        "Confirmar, remarcar, disparar lista, lembrar prazo, anotar quem é flexível de manhã… isso é gestão. Quem está com a máquina na mão vive outra realidade: atraso, walk-in, fornecedor, barbeiro faltando.",
        y,
    )
    y -= 4 * mm
    y = p(
        c,
        "Resultado clássico: o método dura 3–4 dias. Depois a casa volta ao WhatsApp caótico — e a vaga perdida volta quieta.",
        y,
    )
    y -= 5 * mm
    y = callout(
        c,
        y,
        "A PERGUNTA QUE MUDA O JOGO",
        "E se a marcação, a visão do dia e a presença da marca vivessem num sistema — enquanto você corta? Não para “ter tecnologia”. Para não depender da sua memória e do seu polegar o dia inteiro.",
        WARN,
        36 * mm,
    )
    y -= 2 * mm
    y = p(
        c,
        "É isso que o Barbernegon faz no Pilar 2: o mesmo problema do Pilar 1, com execução que não some quando o salão enche.",
        y,
        10,
    )

    # —— 8 PILAR 2 MAPA ——
    y = b.page()
    topbar(c, "Pilar 2 · sistema")
    y = pillar_badge(c, y, "PILAR 2 — BARBERNEGON EXECUTA O MÉTODO")
    y = h1(c, "Cada buraco do Pilar 1 tem um lugar no sistema", y)
    y -= 3 * mm
    y = p(
        c,
        "Não é “tem app”. É ponte direta com o mecanismo que você acabou de ver.",
        y,
    )
    y -= 4 * mm
    bridges = [
        (
            "Confirmação / no-show",
            "A reserva fica registrada com cliente, serviço e horário. Base para cobrar confirmação — não conversa solta no meio de 40 chats.",
        ),
        (
            "Reposição do buraco",
            "Painel e grade mostram o que está livre e o que precisa de ação. Você dispara a lista olhando o dia, não “lembrando de cabeça”.",
        ),
        (
            "Inventário no WhatsApp",
            "O cliente vê horários no fluxo de agendar. Você para de digitar disponibilidade um a um.",
        ),
        (
            "Demanda alugada",
            "Site da sua marca + link próprio. O hábito de marcar fica com você, não com o app que coloca o concorrente ao lado.",
        ),
        (
            "Âncora de compromisso",
            "Página da casa + agendar no mesmo lugar. O cliente marca num ambiente de marca — não num “pode ser?” no chat.",
        ),
    ]
    for title, desc in bridges:
        card(c, M, y - 20 * mm, W - 2 * M, 19 * mm, ELEV)
        c.setFillColorRGB(*SOFT)
        c.setFont(FB, 8)
        c.drawString(M + 3.5 * mm, y - 5.5 * mm, title.upper())
        wrap(c, desc, M + 3.5 * mm, y - 10.5 * mm, W - 2 * M - 7 * mm, F, 8, 10.5, MUTED)
        y -= 22 * mm

    # —— 9 PILAR 2 PRINTS OPERAÇÃO ——
    y = b.page()
    topbar(c, "Pilar 2 · prova visual")
    y = pillar_badge(c, y, "PILAR 2 — ONDE VOCÊ VÊ A VAZÃO")
    y = h1(c, "Grade e painel (prints reais)", y)
    y -= 3 * mm
    y = p(
        c,
        "No Pilar 1 você mediu A e T. Aqui a operação fica visível: faixas fracas, ocupação e o que fazer agora.",
        y,
    )
    y -= 3 * mm
    y = shot(c, "S02-admin-reservas.png", y, "Grade de agendamentos — onde a ocupação cai, a vaga está sumindo.", 58 * mm)
    y -= 2 * mm
    y = shot(c, "S01-dashboard.png", y, "Painel — prioridades do dia (não um feed de WhatsApp).", 50 * mm)

    # —— 10 PILAR 2 AGENDA + SITE ——
    y = b.page()
    topbar(c, "Pilar 2 · canal próprio")
    y = pillar_badge(c, y, "PILAR 2 — MARCAÇÃO FORA DO IMPROVISO")
    y = h1(c, "Cliente marca; você opera", y)
    y -= 3 * mm
    y = p(
        c,
        "Isso ataca o inventário invisível: o horário existe numa tela, não numa resposta atrasada.",
        y,
    )
    y -= 3 * mm
    y = shot(c, "S03-agendar.png", y, "Fluxo de agendar — serviço, horário e resumo.", 70 * mm)
    y -= 2 * mm
    y = shot(c, "S05-site-home.png", y, "Site da marca — âncora visual + caminho para agendar.", 48 * mm)

    # —— 11 PILAR 2 ACESSO ——
    y = b.page()
    topbar(c, "Pilar 2 · acesso")
    y = pillar_badge(c, y, "PILAR 2 — COMO ENTRAR NO SISTEMA")
    y = h1(c, "Do link ao painel (caminho real)", y)
    y -= 3 * mm
    y = p(
        c,
        "Sem mistério. Três entradas. Use no celular ou no computador.",
        y,
    )
    y -= 4 * mm
    y = num_step(c, y, "1", "Abra a plataforma", "Entre pelo link abaixo.")
    y -= 2 * mm
    y = url_box(c, y, "PLATAFORMA", URL_HOME)
    y = num_step(
        c,
        y,
        "2",
        "Crie a barbearia",
        "Cadastro cria org + painel. Use e-mail que você acessa de verdade.",
    )
    y -= 2 * mm
    y = url_box(c, y, "CADASTRO", URL_CADASTRO)
    y = num_step(
        c,
        y,
        "3",
        "Login do painel",
        "Configure serviços, expediente, site e compartilhe o link de agendar.",
    )
    y -= 2 * mm
    y = url_box(c, y, "LOGIN", URL_LOGIN)
    y = url_box(c, y, "PILOTO AO VIVO (EXEMPLO)", URL_PILOTO)
    y -= 1 * mm
    y = callout(
        c,
        y,
        "ORDEM QUE EVITA TRAVAR",
        "1) Serviços e preços  2) Expediente real  3) Site/marca  4) Link de agendar no WhatsApp/Instagram  5) Regra de confirmação com os scripts do Pilar 1",
        BLUE,
        26 * mm,
    )

    # —— 12 PRINTS CADASTRO/LOGIN ——
    y = b.page()
    topbar(c, "Pilar 2 · telas")
    y = pillar_badge(c, y, "PILAR 2 — CADASTRO E LOGIN (PRINTS)")
    y = h1(c, "O que você vê ao criar e entrar", y)
    y -= 3 * mm
    y = shot(c, "S13-cadastro.png", y, "Cadastro — criar barbearia.", 68 * mm)
    y -= 2 * mm
    y = shot(c, "S14-login.png", y, "Login do painel.", 42 * mm)
    y -= 2 * mm
    y = p(
        c,
        "Depois do login: o Pilar 1 (regras e scripts) continua valendo. O sistema só tira o método da sua memória e coloca na operação.",
        y,
        9.5,
    )

    # —— 13 FECHO ——
    y = b.page()
    topbar(c, "Fechamento")
    y = h1(c, "Pilar 1 sem disciplina morre. Pilar 2 sem método vira app inútil.", y, 16)
    y -= 4 * mm
    y = p(
        c,
        "O caminho forte é os dois: regras claras + execução no Barbernegon. Meça a semana. Publique o link. Rode confirmação. Compare de novo em 7 dias.",
        y,
        10.5,
    )
    y -= 5 * mm
    y = url_box(c, y, "CRIAR MINHA BARBEARIA", URL_CADASTRO)
    y = url_box(c, y, "ENTRAR NO PAINEL", URL_LOGIN)
    y = url_box(c, y, "VER PILOTO", URL_PILOTO)
    y -= 3 * mm
    card(c, M, y - 26 * mm, W - 2 * M, 26 * mm, ELEV, BLUE, 1.2)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M + 3.5 * mm, y - 9 * mm, "Sua barbearia, sua cara — sem burocracia.")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8.5)
    c.drawString(M + 3.5 * mm, y - 16 * mm, "Barbernegon · Vaga Perdida · 2 pilares + virada")
    y -= 34 * mm
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(M, y, "Adapte as regras à sua casa. © Barbernegon")

    b.save()


if __name__ == "__main__":
    build()
