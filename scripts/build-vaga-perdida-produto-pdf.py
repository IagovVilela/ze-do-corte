#!/usr/bin/env python3
"""
Vaga Perdida — PDF em 2 pilares + virada.

Pilar 1: solução convencional (método no braço).
Virada: "funciona, mas é pesado fazer todo dia".
Pilar 2: Barbernegon resolve na prática (acesso, prints, vantagens).
Linguagem simples para dono de barbearia.
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
FOOTER = 14 * mm


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
        c.rect(0, H - 2.4 * mm, W, 2.4 * mm, fill=1, stroke=0)
        return H - 18 * mm

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
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, text.upper())


def h1(c, text, y, size=22):
    return wrap(c, text, M, y, W - 2 * M, FB, size, size + 4, FG)


def p(c, text, y, size=10.5):
    return wrap(c, text, M, y, W - 2 * M, F, size, size + 4.5, MUTED)


def card(c, x, y, w, h, fill=ELEV, stroke=LINE, sw=1):
    c.setFillColorRGB(*fill)
    c.setStrokeColorRGB(*stroke)
    c.setLineWidth(sw)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=1)


def bullet(c, y, text):
    c.setFillColorRGB(*BLUE)
    c.circle(M + 1.8 * mm, y + 1.2 * mm, 1.4 * mm, fill=1, stroke=0)
    return wrap(c, text, M + 6 * mm, y, W - 2 * M - 6 * mm, F, 10, 13, FG)


def num_step(c, y, n, title, body):
    c.setFillColorRGB(*BLUE)
    c.setFont(FB, 14)
    c.drawString(M, y, n)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M + 12 * mm, y, title)
    y -= 5 * mm
    return wrap(c, body, M + 12 * mm, y, W - 2 * M - 12 * mm, F, 9.5, 12.5, MUTED)


def shot(c, name, y_top, caption, max_h=68 * mm):
    path = SHOTS / name
    if not path.exists():
        return wrap(c, f"[print ausente: {name}]", M, y_top, W - 2 * M, F, 9, 11, MUTED)
    im = PILImage.open(path)
    iw, ih = im.size
    max_w = W - 2 * M
    scale = min(max_w / iw, max_h / ih)
    dw, dh = iw * scale, ih * scale
    x = M + (max_w - dw) / 2
    y = y_top - dh
    pad = 1.6 * mm
    c.setFillColorRGB(*LINE)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=1, stroke=0)
    c.setStrokeColorRGB(*BLUE)
    c.setLineWidth(1)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=0, stroke=1)
    c.drawImage(ImageReader(path), x, y, width=dw, height=dh, mask="auto")
    return wrap(c, caption, M, y - 4.5 * mm, max_w, F, 8, 10, MUTED, True)


def url_box(c, y, label, url):
    h = 14 * mm
    card(c, M, y - h, W - 2 * M, h, FIELD, BLUE, 1.2)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 7.5)
    c.drawString(M + 3.5 * mm, y - 4.5 * mm, label)
    wrap(c, url, M + 3.5 * mm, y - 9.5 * mm, W - 2 * M - 7 * mm, F, 8, 10, FG)
    return y - h - 4 * mm


def pillar_badge(c, y, text, color=BLUE):
    """Faixa de pilar no topo do conteúdo."""
    card(c, M, y - 10 * mm, W - 2 * M, 10 * mm, ELEV, color, 1.2)
    c.setFillColorRGB(*color)
    c.setFont(FB, 9)
    c.drawCentredString(W / 2, y - 6.5 * mm, text)
    return y - 14 * mm


def build():
    b = Book()
    c = b.c

    # ========== 1 CAPA ==========
    y = b.page()
    topbar(c, "Guia prático Barbernegon · R$ 19,90")
    y = H - 32 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 34)
    c.drawString(M, y, "Vaga Perdida")
    y -= 12 * mm
    y = p(
        c,
        "A cadeira vazia que você nem conta — e o dinheiro que some na semana.",
        y,
        12,
    )
    y -= 6 * mm
    c.setFillColorRGB(*BLUE)
    c.rect(M, y, 22 * mm, 1.2 * mm, fill=1, stroke=0)
    y -= 10 * mm
    y = p(
        c,
        "Este guia tem duas partes:",
        y,
        11,
    )
    y -= 4 * mm
    for t in [
        "Pilar 1 — Como resolver o problema no dia a dia (método simples).",
        "Virada — Por que fazer tudo na mão cansa.",
        "Pilar 2 — Como o Barbernegon cuida disso por você (e como acessar).",
    ]:
        y = bullet(c, y, t)
        y -= 2 * mm
    y -= 8 * mm
    card(c, M, y - 36 * mm, W - 2 * M, 36 * mm, ELEV, BLUE, 1.2)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M + 4 * mm, y - 7 * mm, "PROMESSA")
    wrap(
        c,
        "Em pouco tempo você entende quanto está perdendo, o que fazer — e como colocar site + agenda da sua marca no ar, sem virar secretária do WhatsApp.",
        M + 4 * mm,
        y - 14 * mm,
        W - 2 * M - 8 * mm,
        F,
        10,
        13,
        FG,
    )

    # ========== 2 PARA QUEM ==========
    y = b.page()
    topbar(c, "Antes de começar")
    y = h1(c, "Este guia é para você se…", y)
    y -= 4 * mm
    for t in [
        "Tem uma barbearia (ou poucas cadeiras).",
        "Marca horário no WhatsApp o dia inteiro.",
        "Ainda assim sobra cadeira vazia na semana.",
        "Quer a agenda sob o controle da sua marca — não só do chat.",
    ]:
        y = bullet(c, y, t)
        y -= 2 * mm
    y -= 6 * mm
    y = h1(c, "O que é uma vaga perdida?", y, 18)
    y -= 3 * mm
    y = p(
        c,
        "É um horário que poderia ter sido preenchido e não foi. O cliente confirmou e não veio. Alguém cancelou e ninguém entrou no lugar. Ou o buraco ficou o dia todo porque a marcação depende só do WhatsApp.",
        y,
    )
    y -= 5 * mm
    y = p(
        c,
        "Isso não é “dia fraco”. É falta de método. Abaixo você vê como resolver — primeiro no braço, depois com o sistema.",
        y,
        11,
    )

    # ========== 3 PILAR 1 — CALCULAR ==========
    y = b.page()
    topbar(c, "Pilar 1 · método convencional")
    y = pillar_badge(c, y, "PILAR 1 — RESOLVA O PROBLEMA NO DIA A DIA")
    y = h1(c, "Primeiro: veja o dinheiro que some", y)
    y -= 3 * mm
    y = p(
        c,
        "Pegue a última semana. Só três números. Sem planilha complicada.",
        y,
    )
    y -= 5 * mm
    for n, t, d in [
        ("1", "Horários abertos", "Quantos horários você tinha no expediente?"),
        ("2", "Atendimentos feitos", "Quantos clientes você atendeu de verdade?"),
        ("3", "Preço do corte", "Quanto custa o serviço que você mais vende?"),
    ]:
        y = num_step(c, y, n, t, d)
        y -= 4 * mm
    y -= 2 * mm
    card(c, M, y - 40 * mm, W - 2 * M, 40 * mm, ELEV, BLUE, 1.3)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M + 4 * mm, y - 6 * mm, "A CONTA")
    c.setFillColorRGB(*FG)
    c.setFont(FB, 11)
    c.drawString(M + 4 * mm, y - 14 * mm, "Horários vazios = abertos − feitos")
    c.drawString(M + 4 * mm, y - 22 * mm, "Dinheiro perdido = horários vazios × preço do corte")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 9)
    c.drawString(M + 4 * mm, y - 31 * mm, "Exemplo: 40 abertos − 31 feitos = 9 vazios × R$ 75 = R$ 675 na semana")
    y -= 46 * mm
    y = p(c, "Esse número é o motivo de arrumar a agenda. Não é achismo.", y, 10)

    # ========== 4 PILAR 1 — 5 BURACOS ==========
    y = b.page()
    topbar(c, "Pilar 1 · onde a vaga some")
    y = pillar_badge(c, y, "PILAR 1 — OS 5 BURACOS DA AGENDA")
    y = h1(c, "Quase toda casa perde cadeira por isto", y)
    y -= 4 * mm
    leaks = [
        ("1. Cliente não aparece", "Marcou e sumiu. Sem lembrete, vira rotina."),
        ("2. Buraco no meio do dia", "Cancelou cedo e ninguém entrou no lugar."),
        ("3. Só WhatsApp", "Você vira secretária. Demora = cliente marca em outro."),
        ("4. Só app de busca", "O cliente compara você com o vizinho e some."),
        ("5. Sem site da casa", "Parece “mais uma”. Menos compromisso, mais falta."),
    ]
    for title, desc in leaks:
        card(c, M, y - 18 * mm, W - 2 * M, 17 * mm, ELEV)
        c.setFillColorRGB(*FG)
        c.setFont(FB, 10)
        c.drawString(M + 4 * mm, y - 6 * mm, title)
        c.setFillColorRGB(*MUTED)
        c.setFont(F, 8.5)
        c.drawString(M + 4 * mm, y - 12 * mm, desc)
        y -= 20 * mm
    y -= 2 * mm
    y = p(
        c,
        "No Pilar 1 você fecha esses buracos com hábitos simples. No Pilar 2 o Barbernegon automatiza boa parte disso.",
        y,
        10,
    )

    # ========== 5 PILAR 1 — O QUE FAZER ==========
    y = b.page()
    topbar(c, "Pilar 1 · o que fazer")
    y = pillar_badge(c, y, "PILAR 1 — MÉTODO NO BRAÇO (4 PASSOS)")
    y = h1(c, "Como resolver sem sistema (ainda)", y)
    y -= 3 * mm
    y = p(
        c,
        "Isso funciona. Muita barbearia boa vive assim. O ponto é: exige disciplina todo dia.",
        y,
    )
    y -= 5 * mm
    for n, t, d in [
        (
            "A",
            "Organize os horários",
            "Publique só o expediente real. Bloqueie almoço e folga. Deixe 1 ou 2 janelas por dia para encaixe.",
        ),
        (
            "B",
            "Confirme em 2 toques",
            "Todo horário: confirmação na marcação + lembrete no dia anterior. Sem isso, falta vira normal.",
        ),
        (
            "C",
            "Reponha na hora",
            "Tenha uma lista de 10 a 20 clientes flexíveis. Cancelou → mande mensagem em sequência.",
        ),
        (
            "D",
            "Tire a marcação do chat solto",
            "WhatsApp é para conversar. Marcação precisa de um lugar fixo (link, página, agenda).",
        ),
    ]:
        y = num_step(c, y, n, t, d)
        y -= 5 * mm

    # ========== 6 PILAR 1 — SCRIPTS ==========
    y = b.page()
    topbar(c, "Pilar 1 · textos prontos")
    y = pillar_badge(c, y, "PILAR 1 — MENSAGENS PARA COPIAR")
    y = h1(c, "3 textos que já resolvem muita coisa", y)
    y -= 3 * mm
    y = p(c, "Use no WhatsApp. Troque o que está entre colchetes.", y)
    y -= 5 * mm
    scripts = [
        (
            "QUANDO MARCAR",
            "Fala, [Nome]! Seu horário na [Barbearia] está marcado para [dia] às [hora] — [serviço]. Responde 1 para confirmar ou 2 para remarcar.",
        ),
        (
            "NO DIA ANTERIOR",
            "[Nome], amanhã às [hora] te esperamos. Se não puder, avisa até [horário] que eu chamo outra pessoa.",
        ),
        (
            "QUANDO ABRIR VAGA",
            "Abriu horário hoje às [hora] para [serviço]. Quer encaixar? Responde AGORA.",
        ),
    ]
    for lab, txt in scripts:
        h = 26 * mm
        card(c, M, y - h, W - 2 * M, h, ELEV)
        c.setFillColorRGB(*BLUE)
        c.setFont(FB, 8)
        c.drawString(M + 4 * mm, y - 6 * mm, lab)
        wrap(c, txt, M + 4 * mm, y - 12 * mm, W - 2 * M - 8 * mm, F, 8.5, 11, FG)
        y -= h + 4 * mm
    y -= 2 * mm
    y = p(
        c,
        "Regra simples: quem não confirma, perde preferência no horário nobre. Avise isso na marcação — não depois da briga.",
        y,
        10,
    )

    # ========== 7 VIRADA ==========
    y = b.page()
    topbar(c, "A virada")
    y = pillar_badge(c, y, "VIRADA — FALA SÉRIA COM VOCÊ", WARN)
    y = h1(c, "Tudo isso funciona…", y)
    y -= 4 * mm
    y = p(
        c,
        "Calcular a perda. Confirmar cliente. Ter lista de encaixe. Tirar a agenda do improviso. Sim: funciona.",
        y,
        11,
    )
    y -= 5 * mm
    y = h1(c, "Mas e se parecer pesado demais?", y, 18)
    y -= 4 * mm
    y = p(
        c,
        "Porque é. Fazer isso na mão, todo dia, enquanto você corta cabelo, responde WhatsApp e cuida da casa… vira um segundo expediente.",
        y,
        11,
    )
    y -= 6 * mm
    card(c, M, y - 48 * mm, W - 2 * M, 48 * mm, ELEV, WARN, 1.4)
    c.setFillColorRGB(*WARN)
    c.setFont(FB, 9)
    c.drawString(M + 4 * mm, y - 8 * mm, "A PERGUNTA QUE MUDA O JOGO")
    wrap(
        c,
        "E se existisse um serviço digital que cuidasse disso por você? Site com a cara da sua barbearia. Cliente marca sozinho. Você vê o dia no painel — sem caçar mensagem no chat.",
        M + 4 * mm,
        y - 16 * mm,
        W - 2 * M - 8 * mm,
        F,
        11,
        14,
        FG,
    )
    wrap(
        c,
        "É exatamente para isso que existe o Barbernegon. O Pilar 2 mostra como na prática.",
        M + 4 * mm,
        y - 38 * mm,
        W - 2 * M - 8 * mm,
        FB,
        10,
        13,
        SOFT,
    )

    # ========== 8 PILAR 2 — INTRO ==========
    y = b.page()
    topbar(c, "Pilar 2 · o sistema")
    y = pillar_badge(c, y, "PILAR 2 — O BARBERNEGON CUIDA DISSO POR VOCÊ")
    y = h1(c, "O mesmo problema. Automático.", y)
    y -= 3 * mm
    y = p(
        c,
        "No Pilar 1 você viu o método. Aqui o sistema faz o trabalho pesado: agenda online, painel do dia e site da sua marca.",
        y,
    )
    y -= 5 * mm
    bridges = [
        ("Cliente não aparece", "Reserva fica registrada. Fácil confirmar e acompanhar."),
        ("Buraco no dia", "Painel mostra o que está livre e o que precisa de atenção."),
        ("Só WhatsApp", "Cliente marca sozinho no link da sua casa."),
        ("App de busca", "Você tem site próprio — a marca é sua."),
        ("Sem cara digital", "Foto, serviços e agendar no mesmo lugar."),
    ]
    for a, btxt in bridges:
        card(c, M, y - 16 * mm, W - 2 * M, 15 * mm, ELEV)
        c.setFillColorRGB(*SOFT)
        c.setFont(FB, 8)
        c.drawString(M + 3.5 * mm, y - 5 * mm, a.upper())
        c.setFillColorRGB(*FG)
        c.setFont(F, 9)
        c.drawString(M + 3.5 * mm, y - 11 * mm, btxt)
        y -= 18 * mm

    # ========== 9 PILAR 2 — PRINTS SOLUÇÃO ==========
    y = b.page()
    topbar(c, "Pilar 2 · na prática")
    y = pillar_badge(c, y, "PILAR 2 — PAINEL E AGENDA")
    y = h1(c, "Você enxerga a operação", y)
    y -= 3 * mm
    y = p(
        c,
        "Lembra do buraco no meio do dia? Aqui você vê ocupação e prioridades — sem caçar no WhatsApp.",
        y,
    )
    y -= 3 * mm
    y = shot(c, "S02-admin-reservas.png", y, "Print real: grade de agendamentos no painel.", 58 * mm)
    y -= 2 * mm
    y = shot(c, "S01-dashboard.png", y, "Print real: visão do dia — o que precisa de ação agora.", 48 * mm)

    # ========== 10 PILAR 2 — CLIENTE MARCA ==========
    y = b.page()
    topbar(c, "Pilar 2 · cliente marca sozinho")
    y = pillar_badge(c, y, "PILAR 2 — FORA DO CHAT SOLTO")
    y = h1(c, "Agenda online da sua marca", y)
    y -= 3 * mm
    y = p(
        c,
        "Lembra do “só WhatsApp”? Aqui o cliente escolhe serviço e horário. Você opera o painel — não responde “tem vaga?” o dia todo.",
        y,
    )
    y -= 3 * mm
    y = shot(c, "S03-agendar.png", y, "Print real: tela de agendar do piloto.", 75 * mm)
    y -= 2 * mm
    y = shot(c, "S05-site-home.png", y, "Print real: site com a cara da casa + botão de agendar.", 48 * mm)

    # ========== 11 PILAR 2 — COMO ACESSAR ==========
    y = b.page()
    topbar(c, "Pilar 2 · como acessar")
    y = pillar_badge(c, y, "PILAR 2 — ONDE ENTRAR E COMO COMEÇAR")
    y = h1(c, "Abra o Barbernegon em 3 passos", y)
    y -= 3 * mm
    y = p(c, "Não fica só na teoria. Links reais abaixo.", y)
    y -= 5 * mm
    y = num_step(c, y, "1", "Entre no site", "Abra no celular ou no computador.")
    y -= 2 * mm
    y = url_box(c, y, "PLATAFORMA", URL_HOME)
    y = num_step(
        c,
        y,
        "2",
        "Crie sua conta",
        "Cadastre a barbearia. Em poucos minutos você já tem painel.",
    )
    y -= 2 * mm
    y = url_box(c, y, "CADASTRO", URL_CADASTRO)
    y = num_step(
        c,
        y,
        "3",
        "Entre no painel",
        "Login com o e-mail da conta. Configure serviços, expediente e site.",
    )
    y -= 2 * mm
    y = url_box(c, y, "LOGIN DO PAINEL", URL_LOGIN)
    y -= 2 * mm
    y = url_box(c, y, "VER EXEMPLO AO VIVO (PILOTO)", URL_PILOTO)

    # ========== 12 PILAR 2 — PRINTS ACESSO ==========
    y = b.page()
    topbar(c, "Pilar 2 · telas reais")
    y = pillar_badge(c, y, "PILAR 2 — CADASTRO E LOGIN")
    y = h1(c, "É assim que aparece na tela", y)
    y -= 3 * mm
    y = shot(c, "S13-cadastro.png", y, "Print real: criar sua barbearia (cadastro).", 72 * mm)
    y -= 2 * mm
    y = shot(c, "S14-login.png", y, "Print real: entrar no painel.", 48 * mm)
    y -= 2 * mm
    y = p(
        c,
        "Depois de entrar: cadastre serviços e preços → ajuste o expediente → publique o site → mande o link de agendar no WhatsApp e no Instagram.",
        y,
        10,
    )

    # ========== 13 FECHO ==========
    y = b.page()
    topbar(c, "Comece agora")
    y = h1(c, "Você já tem o método. Agora escolha o caminho.", y, 18)
    y -= 4 * mm
    y = p(
        c,
        "Pode seguir só o Pilar 1 no braço. Funciona — se você aguentar a disciplina. Ou deixa o Barbernegon carregar a parte pesada: site, agenda e visão do dia.",
        y,
        11,
    )
    y -= 6 * mm
    y = url_box(c, y, "CRIAR MINHA BARBEARIA", URL_CADASTRO)
    y = url_box(c, y, "ENTRAR NO PAINEL", URL_LOGIN)
    y = url_box(c, y, "VER PILOTO AO VIVO", URL_PILOTO)
    y -= 4 * mm
    card(c, M, y - 30 * mm, W - 2 * M, 30 * mm, ELEV, BLUE, 1.2)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 13)
    c.drawString(M + 4 * mm, y - 10 * mm, "Sua barbearia, sua cara — sem burocracia.")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 9)
    c.drawString(M + 4 * mm, y - 18 * mm, "Barbernegon · Vaga Perdida · guia em 2 pilares")
    y -= 38 * mm
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(M, y, "Adapte as regras à sua casa. © Barbernegon")

    b.save()


if __name__ == "__main__":
    build()
