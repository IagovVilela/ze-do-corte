#!/usr/bin/env python3
"""
Vaga Perdida — PDF 2 pilares + virada.

Layout: baseline com folga de ascent (badge nunca colide com título).
Conteúdo: mecanismo operacional, não slogans óbvios.
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
ELEV = (0x18 / 255, 0x21 / 255, 0x2E / 255)
FIELD = (0x1A / 255, 0x24 / 255, 0x33 / 255)
LINE = (0x3A / 255, 0x4A / 255, 0x60 / 255)
FG = (0xE8 / 255, 0xEE / 255, 0xF6 / 255)
MUTED = (0xB0 / 255, 0xBC / 255, 0xCE / 255)
BLUE = (0x3B / 255, 0x82 / 255, 0xF6 / 255)
SOFT = (0x8E / 255, 0xB6 / 255, 0xFF / 255)
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


def ascent_pt(size: float) -> float:
    """Altura aproximada acima da baseline (DejaVu / Helvetica)."""
    return size * 0.92


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
        # y = topo útil do conteúdo (abaixo da topbar)
        return H - 22 * mm

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


def measure_lines(c, text, max_w, font, size):
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
    return lines or [""]


def wrap(c, text, x, y, max_w, font, size, leading, color=MUTED, center=False):
    """y = baseline da primeira linha. Retorna y abaixo da última linha."""
    c.setFillColorRGB(*color)
    c.setFont(font, size)
    lines = measure_lines(c, text, max_w, font, size)
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
    c.drawString(M, H - 12 * mm, text.upper())


def h1(c, text, y_top, size=17):
    """y_top = topo do bloco; baseline fica abaixo do ascent — sem invadir o que está acima."""
    baseline = y_top - ascent_pt(size)
    y = wrap(c, text, M, baseline, W - 2 * M, FB, size, size + 5, FG)
    return y - 2 * mm


def p(c, text, y_top, size=10):
    baseline = y_top - ascent_pt(size)
    return wrap(c, text, M, baseline, W - 2 * M, F, size, size + 4.5, MUTED)


def card(c, x, y, w, h, fill=ELEV, stroke=LINE, sw=1):
    c.setFillColorRGB(*fill)
    c.setStrokeColorRGB(*stroke)
    c.setLineWidth(sw)
    c.roundRect(x, y, w, h, 3.5, fill=1, stroke=1)


def bullet(c, y_top, text, size=9.5):
    baseline = y_top - ascent_pt(size)
    c.setFillColorRGB(*BLUE)
    c.circle(M + 1.6 * mm, baseline + 1.1 * mm, 1.3 * mm, fill=1, stroke=0)
    return wrap(c, text, M + 5.5 * mm, baseline, W - 2 * M - 5.5 * mm, F, size, size + 3.5, FG)


def num_step(c, y_top, n, title, body):
    title_size = 11
    body_size = 9
    tb = y_top - ascent_pt(title_size)
    c.setFillColorRGB(*BLUE)
    c.setFont(FB, 12)
    c.drawString(M, tb, str(n))
    c.setFillColorRGB(*FG)
    c.setFont(FB, title_size)
    c.drawString(M + 10 * mm, tb, title)
    body_top = tb - 4.5 * mm
    bb = body_top - ascent_pt(body_size)
    return wrap(c, body, M + 10 * mm, bb, W - 2 * M - 10 * mm, F, body_size, 12, MUTED)


def shot(c, name, y_top, caption, max_h=62 * mm):
    path = SHOTS / name
    if not path.exists():
        return y_top - 6 * mm
    max_h = min(max_h, y_top - CONTENT_BOTTOM - 12 * mm)
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
    cap_top = y - pad - 3.5 * mm
    return wrap(c, caption, M, cap_top - ascent_pt(7.5), max_w, F, 7.5, 9.5, MUTED, True)


def url_box(c, y_top, label, url):
    h = 14 * mm
    card(c, M, y_top - h, W - 2 * M, h, FIELD, BLUE, 1.1)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 7)
    c.drawString(M + 3 * mm, y_top - 4.5 * mm, label)
    wrap(c, url, M + 3 * mm, y_top - 10 * mm, W - 2 * M - 6 * mm, F, 7.5, 9.5, FG)
    return y_top - h - 4 * mm


def pillar_badge(c, y_top, text, color=BLUE):
    """
    Badge com folga OBRIGATÓRIA abaixo do box.
    Retorna y_top do próximo bloco (título/parágrafo).
    O h1 consome ascent internamente — nunca começa colado no badge.
    """
    bh = 10 * mm
    card(c, M, y_top - bh, W - 2 * M, bh, ELEV, color, 1.1)
    c.setFillColorRGB(*color)
    c.setFont(FB, 8)
    # texto verticalmente centrado no box
    c.drawCentredString(W / 2, y_top - bh / 2 - 1.4 * mm, text)
    # 10mm box + 14mm folga (ascent do h1 ~6mm + respiro visual)
    return y_top - bh - 14 * mm


def callout(c, y_top, label, body, color=BLUE):
    """Altura dinâmica — corpo nunca corta."""
    inner_w = W - 2 * M - 7 * mm
    body_lines = measure_lines(c, body, inner_w, F, 9)
    # label ~5.5mm + corpo + paddings
    h = 8 * mm + len(body_lines) * 12 + 4 * mm
    card(c, M, y_top - h, W - 2 * M, h, ELEV, color, 1.2)
    c.setFillColorRGB(*color)
    c.setFont(FB, 7.5)
    c.drawString(M + 3.5 * mm, y_top - 5.5 * mm, label)
    wrap(c, body, M + 3.5 * mm, y_top - 11.5 * mm, inner_w, F, 9, 12, FG)
    return y_top - h - 5 * mm


def mech_card(c, y_top, title, body, title_color=FG):
    """Card de mecanismo com altura dinâmica."""
    inner_w = W - 2 * M - 7 * mm
    body_lines = measure_lines(c, body, inner_w, F, 8.5)
    h = 9 * mm + len(body_lines) * 11 + 3.5 * mm
    card(c, M, y_top - h, W - 2 * M, h, ELEV)
    c.setFillColorRGB(*title_color)
    c.setFont(FB, 9.5)
    c.drawString(M + 3.5 * mm, y_top - 6 * mm, title)
    wrap(c, body, M + 3.5 * mm, y_top - 12 * mm, inner_w, F, 8.5, 11, MUTED)
    return y_top - h - 3.5 * mm


def script_card(c, y_top, label, body):
    inner_w = W - 2 * M - 7 * mm
    body_lines = measure_lines(c, body, inner_w, F, 8.5)
    h = 9 * mm + len(body_lines) * 11 + 3.5 * mm
    card(c, M, y_top - h, W - 2 * M, h, ELEV)
    c.setFillColorRGB(*BLUE)
    c.setFont(FB, 7.5)
    c.drawString(M + 3.5 * mm, y_top - 5.5 * mm, label)
    wrap(c, body, M + 3.5 * mm, y_top - 11.5 * mm, inner_w, F, 8.5, 11, FG)
    return y_top - h - 3.5 * mm


def build():
    b = Book()
    c = b.c

    # —— 1 CAPA ——
    y = b.page()
    topbar(c, "Guia Barbernegon · R$ 19,90 · 2 pilares")
    y = H - 30 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 30)
    c.drawString(M, y, "Vaga Perdida")
    y -= 12 * mm
    y = p(
        c,
        "A casa parece cheia no WhatsApp e ainda assim a semana fecha fraca. O buraco não é “falta de cliente” — é slot que podia ter virado dinheiro e evaporou sem ninguém medir.",
        y,
        11,
    )
    y -= 5 * mm
    c.setFillColorRGB(*BLUE)
    c.rect(M, y, 20 * mm, 1.1 * mm, fill=1, stroke=0)
    y -= 7 * mm
    y = callout(
        c,
        y,
        "O QUE ESTE GUIA NÃO É",
        "Não é motivação, checklist escolar nem “organize melhor”. É o mecanismo da vazão (por que a cadeira esfria), um método no braço que aguenta o dia a dia, e o caminho no Barbernegon para a execução não depender do seu polegar o tempo todo.",
        BLUE,
    )
    for t in [
        "Pilar 1 — Conta, mecanismos e regras que seguram a cadeira.",
        "Virada — Por que o método morre quando você está cortando.",
        "Pilar 2 — Onde cada buraco cai no Barbernegon + como entrar.",
    ]:
        y = bullet(c, y, t)
        y -= 2 * mm

    # —— 2 DIAGNÓSTICO ——
    y = b.page()
    topbar(c, "Diagnóstico")
    y = h1(c, "WhatsApp ocupado é métrica falsa", y)
    y -= 2 * mm
    y = p(
        c,
        "Mensagem o dia inteiro parece demanda. Na prática costuma ser atrito: horário que já passou, remarcação em cima da hora, “só olhando”, orçamento sem compromisso. Enquanto você digita, faixas da grade esfriam — e o chat não mostra inventário.",
        y,
    )
    y -= 3 * mm
    y = p(
        c,
        "Vaga perdida = slot vendável que não virou atendimento pago. Não é só “faltou”. É cancelou sem reposição, é horário que você “guardou” ontem e hoje ficou vazio, é faixa que nunca foi oferecida com clareza porque a resposta demorou 40 minutos.",
        y,
    )
    y -= 4 * mm
    y = callout(
        c,
        y,
        "CUSTO DUPLO DO NO-SHOW",
        "Ao reservar, você já matou outra venda. Se a falta vem sem lista de encaixe, paga ticket zerado + a oportunidade que já tinha recusado. Por isso “cliente fiel que falta” sem política custa mais do que parece.",
        WARN,
    )
    y = callout(
        c,
        y,
        "TESTE RÁPIDO (5 MIN)",
        "Abra a última terça. Conte slots vazios entre 14h–17h. Se tinham mensagem no WhatsApp pedindo “tem horário?” nessa faixa e a cadeira ficou fria, o problema não era demanda — era inventário invisível + demora de resposta.",
        BLUE,
    )
    y = h1(c, "Para quem este guia serve", y, 14)
    y -= 2 * mm
    for t in [
        "1 unidade, poucos barbeiros, agenda ainda misturada no WhatsApp.",
        "Casa “andando”, mas o caixa da semana não fecha como o movimento sugere.",
        "Já tentou organizar e em 48h voltou ao improviso — sem regra escrita nem prazo morto.",
    ]:
        y = bullet(c, y, t)
        y -= 1.5 * mm

    # —— 3 PILAR 1 MEDIR ——
    y = b.page()
    topbar(c, "Pilar 1 · medição")
    y = pillar_badge(c, y, "PILAR 1 — MEÇA CAPACIDADE QUEIMADA, NÃO FEELING")
    y = h1(c, "Três números. Uma semana. Sem achismo.", y)
    y -= 2 * mm
    y = p(
        c,
        "Pegue uma semana já fechada. Conte só o que aconteceu. Se o corte é 40 min, conte slots — não “horas cheias” inventadas.",
        y,
    )
    y -= 3 * mm
    for n, t, d in [
        (
            "1",
            "Capacidade (A)",
            "Slots vendáveis do expediente: tire almoço, folga, bloqueio, deslocamento. Se dois barbeiros, some as cadeiras — não a “média de movimento”.",
        ),
        (
            "2",
            "Atendidos (T)",
            "Só quem sentou e concluiu. Confirmado que não veio = 0. Cancelado sem alguém no lugar = 0. Remarcado para outro dia não salva o slot de hoje.",
        ),
        (
            "3",
            "Ticket âncora",
            "Preço do serviço que mais vende (não a média sonhada). Se 70% é corte, use o preço do corte — senão a conta mente para cima.",
        ),
    ]:
        y = num_step(c, y, n, t, d)
        y -= 3.5 * mm
    y -= 1 * mm
    y = callout(
        c,
        y,
        "FÓRMULA + LEITURA",
        "Slots vazios = A − T.  Dinheiro na mesa = (A − T) × ticket.  Ex.: A=48 · T=37 · ticket R$ 70 → 11 slots · R$ 770/semana. Em 4 semanas, quase um aluguel — sem alarme no caixa. Se (A−T)/A > 20%, a casa não está “meio parada”: está vazando capacidade de forma estrutural.",
        BLUE,
    )
    y = p(
        c,
        "Se o número doer, use-o para mudar regra (confirmação, lista, inventário). Motivação não fecha buraco.",
        y,
        9.5,
    )

    # —— 4 PILAR 1 MECANISMOS ——
    y = b.page()
    topbar(c, "Pilar 1 · mecanismos")
    y = pillar_badge(c, y, "PILAR 1 — CINCO VAZAMENTOS (NÃO SLOGANS)")
    y = h1(c, "Por que a vaga some de verdade", y)
    y -= 2 * mm
    leaks = [
        (
            "1. Assimetria de compromisso",
            "Você trata o “ok” no chat como reserva. O cliente trata como intenção. Sem prazo explícito, a falta é previsível — não é má-fé, é desenho ruim.",
        ),
        (
            "2. Janela de reposição (60–90 min)",
            "Cancelou de manhã sem lista pronta? Depois das 11h a chance de encaixe despenca. O buraco não é o cancelamento — é a demora em disparar quem é flexível.",
        ),
        (
            "3. Inventário invisível",
            "Responder horário um a um esconde o que ainda está livre. Enquanto você digita, o cliente já perguntou no salão do lado. A demanda não some: ela escolhe quem responde primeiro com clareza.",
        ),
        (
            "4. Demanda alugada",
            "Marketplace traz visita, não hábito. O cliente compara preço ao lado. Você paga com margem e com a marca diluída — e o histórico de marcação fica com o app, não com você.",
        ),
        (
            "5. Compromisso sem âncora",
            "Marcação só no chat parece conversa. Página da casa + horário no mesmo lugar sobe o peso psicológico do “eu marquei”. Falta cai quando a reserva parece reserva.",
        ),
    ]
    for title, desc in leaks:
        y = mech_card(c, y, title, desc)
    y -= 1 * mm
    y = callout(
        c,
        y,
        "ORDEM DE ATAQUE (SE SÓ DER PARA MUDAR UMA COISA)",
        "1) Prazo morto na confirmação  2) Lista de 10 nomes flexíveis por faixa  3) Link de inventário no lugar de digitar horário. Confirmação sozinha já corta no-show; sem lista, o cancelamento ainda vira buraco.",
        BLUE,
    )

    # —— 5 PILAR 1 OPERAÇÃO ——
    y = b.page()
    topbar(c, "Pilar 1 · operação")
    y = pillar_badge(c, y, "PILAR 1 — REGRAS QUE SEGURAM A CADEIRA")
    y = h1(c, "Quatro alavancas com precisão", y)
    y -= 2 * mm
    for n, t, d in [
        (
            "A",
            "Oferta com inventário real",
            "Mostre só o que existe. Separe serviço longo de curto (não venda “encaixe de barba” em slot de 50 min). Reserve 1–2 slots/dia para encaixe; se não usar até 3h antes, libera. Inventário mentiroso gera remarcação e raiva.",
        ),
        (
            "B",
            "Confirmação com prazo morto",
            "Na marcação: 1 confirma / 2 remarca até um horário fixo. Na véspera às 18h: lembrete. Sem resposta até o prazo → libera para a lista. Não “cobre de novo” o mesmo cliente 4 vezes — isso treina atraso.",
        ),
        (
            "C",
            "Lista segmentada (não “clientes em geral”)",
            "10–20 nomes flexíveis por faixa (manhã/tarde) e por serviço. Cancelou → dispara em ordem, um a um, começando por quem já pediu encaixe essa semana. Grupo no WhatsApp vira leilão e queima relacionamento.",
        ),
        (
            "D",
            "Canal de marcação ≠ canal de papo",
            "WhatsApp para relacionamento. Marcação num fluxo único (link). Misturar orçamento, atraso e reserva na mesma conversa é o que explode a operação às 19h — e esconde os buracos da grade.",
        ),
    ]:
        y = num_step(c, y, n, t, d)
        y -= 3 * mm
    y -= 1 * mm
    y = callout(
        c,
        y,
        "POLÍTICA ANTI FALTA (CURTA)",
        "2 faltas seguidas sem aviso → próximo horário só em faixa menos nobre (ou sinal simbólico). Avise na primeira marcação. Regra inventada depois da briga não cola — você perde o cliente e a autoridade.",
        WARN,
    )

    # —— 6 PILAR 1 SCRIPTS ——
    y = b.page()
    topbar(c, "Pilar 1 · scripts")
    y = pillar_badge(c, y, "PILAR 1 — TEXTOS QUE CRIAM COMPROMISSO")
    y = h1(c, "Três mensagens, três vazamentos", y)
    y -= 2 * mm
    y = p(
        c,
        "Não é “mensagem bonitinha”. Cada uma fecha um buraco: compromisso na marcação, proteção na véspera, velocidade no encaixe. Prazo + fila = a vaga passa a ter valor.",
        y,
    )
    y -= 3 * mm
    scripts = [
        (
            "MARCAÇÃO — cria compromisso",
            "Fala, [Nome]! Horário na [Barbearia]: [dia] às [hora] — [serviço]. Responde 1 para confirmar ou 2 para remarcar até [prazo]. Sem resposta, libero a vaga para a fila de encaixe.",
        ),
        (
            "VÉSPERA — protege o dia",
            "[Nome], amanhã às [hora] te esperamos. Se não puder, avisa até [limite] — tenho fila de encaixe. Depois disso a vaga pode ir para outra pessoa.",
        ),
        (
            "ENCAIXE — recupera slot",
            "Abriu [serviço] hoje às [hora] na [Barbearia]. É encaixe. Quer? Responde AGORA (tenho mais 2 pessoas na fila).",
        ),
    ]
    for lab, txt in scripts:
        y = script_card(c, y, lab, txt)
    y -= 1 * mm
    y = callout(
        c,
        y,
        "ERRO CARO QUE PARECE EDUCAÇÃO",
        "Mandar “ok, te espero!” sem prazo, sem opção 1/2 e sem mencionar fila. Soa educado — e treina o cliente a tratar a vaga como conversa, não como reserva. Educação ≠ compromisso.",
        WARN,
    )
    y = p(
        c,
        "Detalhe que muda resultado: citar prazo e fila. A vaga passa a ter dono temporário — não favor eterno no chat.",
        y,
        9.5,
    )

    # —— 7 VIRADA ——
    y = b.page()
    topbar(c, "Virada")
    y = pillar_badge(c, y, "VIRADA — ONDE O MÉTODO ENCONTRA O LIMITE", WARN)
    y = h1(c, "O método funciona. O gargalo é a execução humana.", y)
    y -= 2 * mm
    y = p(
        c,
        "Confirmar, remarcar, disparar lista, lembrar prazo, saber quem é flexível de manhã… isso é gestão. Quem está com a máquina na mão vive outra fila: atraso, walk-in, fornecedor, barbeiro faltando.",
        y,
    )
    y -= 3 * mm
    y = p(
        c,
        "Padrão: o método dura 3–4 dias. Depois a casa volta ao WhatsApp caótico — e a vaga perdida volta quieta, sem alarme.",
        y,
    )
    y -= 4 * mm
    y = callout(
        c,
        y,
        "A PERGUNTA QUE MUDA O JOGO",
        "E se a marcação, a visão do dia e a presença da marca vivessem num sistema — enquanto você corta? Não para “ter tecnologia”. Para o método não depender da sua memória e do seu polegar quando o salão enche.",
        WARN,
    )
    y = callout(
        c,
        y,
        "SINAL DE QUE O MÉTODO MORREU",
        "Você ainda “sabe” as regras — mas a última confirmação com prazo foi há 5 dias, a lista de encaixe está desatualizada e o link de agendar não está no Instagram. Conhecimento sem rotina = vaga perdida de novo.",
        BLUE,
    )
    y = p(
        c,
        "Pilar 2 = o mesmo problema do Pilar 1, com execução que não some no rush.",
        y,
        10,
    )

    # —— 8 PILAR 2 MAPA ——
    y = b.page()
    topbar(c, "Pilar 2 · sistema")
    y = pillar_badge(c, y, "PILAR 2 — CADA BURACO TEM UM LUGAR NO SISTEMA")
    y = h1(c, "Ponte direta: vazamento → Barbernegon", y)
    y -= 2 * mm
    y = p(
        c,
        "Não é “tem app”. É onde cada mecanismo do Pilar 1 deixa de viver só na sua cabeça.",
        y,
    )
    y -= 3 * mm
    bridges = [
        (
            "Assimetria / no-show",
            "A reserva fica com cliente, serviço e horário. Confirmação e política param de ser conversa solta no meio de 40 chats.",
        ),
        (
            "Janela de reposição",
            "Grade e painel mostram o que está livre e o que precisa de ação agora. Você dispara a lista olhando o dia — não “lembrando de cabeça”.",
        ),
        (
            "Inventário invisível",
            "O cliente vê horários no fluxo de agendar. Você para de digitar disponibilidade um a um enquanto a cadeira esfria.",
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
        y = mech_card(c, y, title.upper(), desc, SOFT)
    y -= 1 * mm
    y = callout(
        c,
        y,
        "O QUE O SISTEMA NÃO FAZ SOZINHO",
        "Não inventa a lista de encaixe, não define sua política de falta e não escreve o texto da véspera. Pilar 1 continua sendo a regra; Pilar 2 é onde a regra para de viver só no polegar.",
        WARN,
    )

    # —— 9 PILAR 2 PRINTS ——
    y = b.page()
    topbar(c, "Pilar 2 · prova visual")
    y = pillar_badge(c, y, "PILAR 2 — ONDE VOCÊ VÊ A VAZÃO")
    y = h1(c, "Grade e painel (prints reais)", y)
    y -= 2 * mm
    y = p(
        c,
        "No Pilar 1 você mediu A e T. Aqui a operação fica visível: faixas fracas, ocupação e o que fazer agora — sem adivinhar pelo volume do chat.",
        y,
    )
    y -= 3 * mm
    y = shot(
        c,
        "S02-admin-reservas.png",
        y,
        "Grade — onde a ocupação cai, a vaga está sumindo.",
        56 * mm,
    )
    y -= 2 * mm
    y = shot(
        c,
        "S01-dashboard.png",
        y,
        "Painel — prioridades do dia (não um feed de WhatsApp).",
        48 * mm,
    )

    # —— 10 PILAR 2 CANAL ——
    y = b.page()
    topbar(c, "Pilar 2 · canal próprio")
    y = pillar_badge(c, y, "PILAR 2 — MARCAÇÃO FORA DO IMPROVISO")
    y = h1(c, "Cliente marca; você opera", y)
    y -= 2 * mm
    y = p(
        c,
        "Ataque ao inventário invisível: o horário existe numa tela com serviço e resumo — não numa resposta atrasada no meio do papo.",
        y,
    )
    y -= 3 * mm
    y = shot(c, "S03-agendar.png", y, "Fluxo de agendar — serviço, horário e resumo.", 68 * mm)
    y -= 2 * mm
    y = shot(
        c,
        "S05-site-home.png",
        y,
        "Site da marca — âncora visual + caminho para agendar.",
        46 * mm,
    )

    # —— 11 PILAR 2 ACESSO ——
    y = b.page()
    topbar(c, "Pilar 2 · acesso")
    y = pillar_badge(c, y, "PILAR 2 — DO LINK AO PAINEL")
    y = h1(c, "Caminho real (sem mistério)", y)
    y -= 2 * mm
    y = p(c, "Três entradas. Celular ou computador. Ordem abaixo evita travar na configuração.", y)
    y -= 3 * mm
    y = num_step(c, y, "1", "Abra a plataforma", "Entre pelo link abaixo.")
    y -= 2 * mm
    y = url_box(c, y, "PLATAFORMA", URL_HOME)
    y = num_step(
        c,
        y,
        "2",
        "Crie a barbearia",
        "O cadastro cria a organização e o painel. Use um e-mail que você acessa de verdade.",
    )
    y -= 2 * mm
    y = url_box(c, y, "CADASTRO", URL_CADASTRO)
    y = num_step(
        c,
        y,
        "3",
        "Login e configuração",
        "Serviços, expediente, site — depois compartilhe o link de agendar. Os scripts do Pilar 1 continuam valendo.",
    )
    y -= 2 * mm
    y = url_box(c, y, "LOGIN", URL_LOGIN)
    y = url_box(c, y, "PILOTO AO VIVO (EXEMPLO)", URL_PILOTO)
    y = callout(
        c,
        y,
        "ORDEM QUE EVITA TRAVAR",
        "1) Serviços e preços  2) Expediente real  3) Site/marca  4) Link de agendar no WhatsApp/Instagram  5) Regra de confirmação com os scripts do Pilar 1",
        BLUE,
    )

    # —— 12 PRINTS CADASTRO ——
    y = b.page()
    topbar(c, "Pilar 2 · telas")
    y = pillar_badge(c, y, "PILAR 2 — CADASTRO E LOGIN")
    y = h1(c, "O que você vê ao criar e entrar", y)
    y -= 2 * mm
    y = shot(c, "S13-cadastro.png", y, "Cadastro — criar barbearia.", 66 * mm)
    y -= 2 * mm
    y = shot(c, "S14-login.png", y, "Login do painel.", 40 * mm)
    y -= 2 * mm
    y = p(
        c,
        "Depois do login: Pilar 1 (regras e scripts) continua. O sistema tira o método da memória e coloca na operação.",
        y,
        9.5,
    )

    # —— 13 FECHO ——
    y = b.page()
    topbar(c, "Fechamento")
    y = h1(c, "Pilar 1 sem disciplina morre. Pilar 2 sem método vira app inútil.", y, 15)
    y -= 3 * mm
    y = p(
        c,
        "O caminho forte é os dois: regras claras + execução no Barbernegon. Meça a semana. Publique o link. Rode confirmação. Compare A−T de novo em 7 dias.",
        y,
        10.5,
    )
    y -= 4 * mm
    y = url_box(c, y, "CRIAR MINHA BARBEARIA", URL_CADASTRO)
    y = url_box(c, y, "ENTRAR NO PAINEL", URL_LOGIN)
    y = url_box(c, y, "VER PILOTO", URL_PILOTO)
    y -= 2 * mm
    card(c, M, y - 28 * mm, W - 2 * M, 28 * mm, ELEV, BLUE, 1.2)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M + 3.5 * mm, y - 10 * mm, "Sua barbearia, sua cara — sem burocracia.")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8.5)
    c.drawString(M + 3.5 * mm, y - 17 * mm, "Barbernegon · Vaga Perdida · 2 pilares + virada")
    c.setFont(F, 8)
    c.drawString(M + 3.5 * mm, y - 23 * mm, "Adapte as regras à sua casa. © Barbernegon")

    b.save()


if __name__ == "__main__":
    build()
