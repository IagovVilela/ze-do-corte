#!/usr/bin/env python3
"""
Vaga Perdida — guia-solução (PDF produto).

Modelo: problema → número → o que fazer → como abrir o Barbernegon e fazer.
NÃO é caderno de atividade escolar. Linguagem simples (dono de barbearia).
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

# URLs reais (produção Railway — trocar pelo domínio final quando estiver no ar)
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
    c.setFillColorRGB(*FG)
    c.setFont(F, 8.5)
    # URLs longas: quebrar se preciso
    wrap(c, url, M + 3.5 * mm, y - 9.5 * mm, W - 2 * M - 7 * mm, F, 8, 10, FG)
    return y - h - 4 * mm


def calc_box(c, x, y, w, h):
    a, t, ticket = 40, 31, 75
    lost, money = a - t, (a - t) * ticket
    card(c, x, y, w, h, SURF, LINE, 1)

    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 7.5)
    c.drawString(x + 4 * mm, y + h - 6 * mm, "EXEMPLO RÁPIDO")

    c.setFillColorRGB(*FG)
    c.setFont(FB, 26)
    c.drawString(x + 4 * mm, y + h - 17 * mm, f"R$ {money}")

    c.setFillColorRGB(*MUTED)
    c.setFont(F, 9)
    c.drawString(x + 4 * mm, y + h - 23 * mm, f"{lost} horários vazios numa semana")

    # barras simples
    bar_b = y + 12 * mm
    max_h = y + h - 30 * mm - bar_b
    bw = 18 * mm
    c.setFillColorRGB(*OK)
    c.roundRect(x + 8 * mm, bar_b, bw, max_h * (t / a), 3, fill=1, stroke=0)
    c.setFillColorRGB(*BLUE)
    c.roundRect(x + 8 * mm + bw + 8 * mm, bar_b, bw, max_h * (lost / a), 3, fill=1, stroke=0)
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 7)
    c.drawCentredString(x + 8 * mm + bw / 2, y + 5 * mm, "Atendeu")
    c.drawCentredString(x + 8 * mm + bw + 8 * mm + bw / 2, y + 5 * mm, "Perdeu")

    # fórmula à direita
    rx = x + w * 0.52
    card(c, rx, y + 8 * mm, w * 0.42, h - 16 * mm, ELEV, BLUE, 1.1)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(rx + 3 * mm, y + h - 14 * mm, "COMO CALCULAR")
    c.setFillColorRGB(*FG)
    c.setFont(F, 9)
    lines = [
        "1. Conte os horários abertos",
        "2. Conte quantos atendeu",
        "3. Subtraia (abertos − feitos)",
        "4. Multiplique pelo preço",
        "   do seu corte mais comum",
    ]
    yy = y + h - 22 * mm
    for line in lines:
        c.drawString(rx + 3 * mm, yy, line)
        yy -= 5 * mm


def build():
    b = Book()
    c = b.c

    # ========== 1 CAPA ==========
    y = b.page()
    topbar(c, "Guia prático Barbernegon · R$ 19,90")
    y = H - 30 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 34)
    c.drawString(M, y, "Vaga Perdida")
    y -= 11 * mm
    y = p(
        c,
        "Se a cadeira fica vazia e o WhatsApp não para, você está perdendo dinheiro. Este guia mostra onde some — e como recuperar usando o Barbernegon.",
        y,
        11,
    )
    y -= 6 * mm
    c.setFillColorRGB(*BLUE)
    c.rect(M, y, 22 * mm, 1.2 * mm, fill=1, stroke=0)
    y -= 8 * mm
    calc_h = min(78 * mm, y - FOOTER - 8 * mm)
    calc_box(c, M, y - calc_h, W - 2 * M, calc_h)

    # ========== 2 PARA QUEM / PROBLEMA ==========
    y = b.page()
    topbar(c, "O problema")
    y = h1(c, "Para quem é este guia", y)
    y -= 4 * mm
    for t in [
        "Você tem uma barbearia (ou poucas cadeiras).",
        "Marca horário no WhatsApp o dia inteiro.",
        "Ainda assim sobra cadeira vazia na semana.",
        "Quer parar de improvisar e ter a agenda na sua marca.",
    ]:
        y = bullet(c, y, t)
        y -= 2 * mm
    y -= 4 * mm
    y = h1(c, "O que é uma vaga perdida?", y, 18)
    y -= 3 * mm
    y = p(
        c,
        "É um horário que poderia ter sido preenchido e não foi. O cliente confirmou e não veio. Alguém cancelou e ninguém entrou no lugar. Ou o buraco ficou o dia todo porque a marcação depende só do chat.",
        y,
    )
    y -= 5 * mm
    y = p(
        c,
        "Isso não é “dia fraco”. É falha de organização. E tem solução.",
        y,
        11,
    )
    y -= 6 * mm
    card(c, M, y - 32 * mm, W - 2 * M, 32 * mm, ELEV, BLUE, 1.1)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M + 4 * mm, y - 7 * mm, "O QUE VOCÊ LEVA DESTE GUIA")
    wrap(
        c,
        "1) Um jeito simples de calcular o prejuízo.  2) Os 5 buracos que mais derrubam a agenda.  3) O que fazer em cada um.  4) Como abrir o Barbernegon e colocar site + agenda no ar.",
        M + 4 * mm,
        y - 14 * mm,
        W - 2 * M - 8 * mm,
        F,
        9.5,
        12.5,
        FG,
    )

    # ========== 3 CALCULAR ==========
    y = b.page()
    topbar(c, "Passo 1 · veja o número")
    y = h1(c, "Quanto você deixou de ganhar?", y)
    y -= 3 * mm
    y = p(
        c,
        "Pegue a última semana. Não precisa de planilha complicada — só três números.",
        y,
    )
    y -= 5 * mm
    steps = [
        ("1", "Horários abertos", "Quantos horários você tinha disponíveis no expediente?"),
        ("2", "Atendimentos feitos", "Quantos clientes você atendeu de verdade?"),
        ("3", "Preço do corte", "Quanto custa o serviço que você mais vende?"),
    ]
    for n, t, d in steps:
        y = num_step(c, y, n, t, d)
        y -= 5 * mm
    y -= 2 * mm
    card(c, M, y - 36 * mm, W - 2 * M, 36 * mm, ELEV, BLUE, 1.3)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M + 4 * mm, y - 6 * mm, "CONTA FINAL")
    c.setFillColorRGB(*FG)
    c.setFont(FB, 11)
    c.drawString(M + 4 * mm, y - 14 * mm, "Horários vazios = abertos − feitos")
    c.drawString(M + 4 * mm, y - 22 * mm, "Dinheiro perdido = horários vazios × preço do corte")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8.5)
    c.drawString(M + 4 * mm, y - 30 * mm, "Ex.: 40 abertos − 31 feitos = 9 vazios × R$ 75 = R$ 675 na semana")
    y -= 42 * mm
    y = p(
        c,
        "Guarde esse número. É ele que justifica arrumar a agenda — não achismo.",
        y,
        10,
    )

    # ========== 4 CINCO BURACOS ==========
    y = b.page()
    topbar(c, "Passo 2 · onde a vaga some")
    y = h1(c, "Os 5 buracos da agenda", y)
    y -= 3 * mm
    y = p(c, "Quase toda barbearia perde cadeira por um (ou mais) destes motivos:", y)
    y -= 5 * mm
    leaks = [
        ("Cliente não aparece", "Marcou e sumiu. Sem lembrete claro, vira rotina."),
        ("Buraco no meio do dia", "Cancelou cedo e ninguém entrou no lugar."),
        ("Só WhatsApp", "Você vira secretária. Demora = cliente marca em outro."),
        ("Só app de busca", "O cliente compara você com o vizinho e some."),
        ("Sem site da casa", "Parece “mais uma”. Menos compromisso, mais falta."),
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

    # ========== 5 SOLUÇÕES + PRINTS ==========
    y = b.page()
    topbar(c, "A solução · no Barbernegon")
    y = h1(c, "Como o sistema fecha esses buracos", y)
    y -= 3 * mm
    y = p(
        c,
        "Não basta “organizar melhor no papel”. Você precisa de agenda online na sua marca + painel para ver o dia.",
        y,
    )
    y -= 4 * mm
    y = shot(
        c,
        "S02-admin-reservas.png",
        y,
        "No painel você vê onde a ocupação cai — horário por horário.",
        72 * mm,
    )
    y -= 3 * mm
    y = p(
        c,
        "Com a grade na mão, fica fácil: confirmar quem vem, encaixar quem cancelou, e parar de descobrir buraco só no fim do dia.",
        y,
        10,
    )

    # ========== 6 AGENDA ONLINE ==========
    y = b.page()
    topbar(c, "Solução · cliente marca sozinho")
    y = h1(c, "Agenda online da sua barbearia", y)
    y -= 3 * mm
    y = p(
        c,
        "O cliente escolhe serviço e horário no celular. Você não precisa responder cada “tem horário amanhã?”.",
        y,
    )
    y -= 4 * mm
    y = shot(c, "S03-agendar.png", y, "Tela de agendar — o cliente faz a reserva sem depender do chat.", 80 * mm)
    y -= 3 * mm
    y = p(
        c,
        "WhatsApp continua para conversar. A marcação sai do improviso e vai para um fluxo limpo.",
        y,
        10,
    )

    # ========== 7 SITE DA MARCA ==========
    y = b.page()
    topbar(c, "Solução · sua marca, não a do app")
    y = h1(c, "Site com a cara da sua casa", y)
    y -= 3 * mm
    y = p(
        c,
        "Em vez de alugar atenção em marketplace, você tem presença própria: foto, serviços e botão de agendar.",
        y,
    )
    y -= 4 * mm
    y = shot(c, "S05-site-home.png", y, "Exemplo real do site do piloto no Barbernegon.", 85 * mm)

    # ========== 8 COMO ACESSAR ==========
    y = b.page()
    topbar(c, "Como usar o Barbernegon")
    y = h1(c, "Abra o sistema em 3 passos", y)
    y -= 3 * mm
    y = p(
        c,
        "Não adianta só saber a teoria. Abaixo está o caminho real para entrar e criar sua barbearia.",
        y,
    )
    y -= 5 * mm
    y = num_step(
        c,
        y,
        "1",
        "Entre no site",
        "Abra o link da plataforma no celular ou no computador.",
    )
    y -= 3 * mm
    y = url_box(c, y, "LINK DA PLATAFORMA", URL_HOME)
    y -= 2 * mm
    y = num_step(
        c,
        y,
        "2",
        "Crie sua conta",
        "Toque em cadastro, preencha os dados da barbearia e confirme. Em poucos minutos você já tem painel.",
    )
    y -= 3 * mm
    y = url_box(c, y, "CRIAR CONTA (CADASTRO)", URL_CADASTRO)
    y -= 2 * mm
    y = num_step(
        c,
        y,
        "3",
        "Entre no painel",
        "Depois de criar, use o login do admin para configurar site, serviços e agenda.",
    )
    y -= 3 * mm
    y = url_box(c, y, "LOGIN DO PAINEL", URL_LOGIN)

    # ========== 9 PRINT CADASTRO ==========
    y = b.page()
    topbar(c, "Passo a passo · cadastro")
    y = h1(c, "Tela de criar sua barbearia", y)
    y -= 3 * mm
    y = p(c, "É assim que aparece a tela de cadastro. Preencha e avance — o sistema cria o site e a agenda da sua marca.", y)
    y -= 4 * mm
    y = shot(c, "S13-cadastro.png", y, "Print real: página de cadastro do Barbernegon.", 95 * mm)
    y -= 3 * mm
    y = p(c, "Dica: use o e-mail que você realmente acessa. É com ele que você entra no painel depois.", y, 10)

    # ========== 10 PRINT LOGIN + PAINEL ==========
    y = b.page()
    topbar(c, "Passo a passo · painel")
    y = h1(c, "Login e visão da operação", y)
    y -= 3 * mm
    y = p(c, "Depois do cadastro, entre com e-mail e senha. O painel mostra o que precisa de atenção no dia.", y)
    y -= 3 * mm
    y = shot(c, "S14-login.png", y, "Print real: tela de login do painel.", 48 * mm)
    y -= 3 * mm
    y = shot(c, "S01-dashboard.png", y, "Print real: painel depois de entrar — prioridades do dia.", 55 * mm)

    # ========== 11 O QUE FAZER NOS PRIMEIROS DIAS ==========
    y = b.page()
    topbar(c, "Coloque no ar")
    y = h1(c, "Primeiros dias no sistema", y)
    y -= 3 * mm
    y = p(c, "Não precisa configurar o mundo no dia 1. Faça nesta ordem:", y)
    y -= 5 * mm
    ordem = [
        ("1", "Serviços e preços", "Cadastre o que você vende (corte, barba, combo)."),
        ("2", "Expediente", "Defina os horários reais de atendimento."),
        ("3", "Site da marca", "Coloque foto, nome e cores da casa."),
        ("4", "Link de agendar", "Copie o link e mande no WhatsApp / Instagram."),
        ("5", "Confirmação", "Combine com o cliente: 1 confirma, 2 remarca."),
    ]
    for n, t, d in ordem:
        y = num_step(c, y, n, t, d)
        y -= 4 * mm
    y -= 2 * mm
    y = url_box(c, y, "VER UM EXEMPLO AO VIVO (PILOTO)", URL_PILOTO)
    y -= 2 * mm
    y = shot(c, "S07-agendar-form.png", y, "É isso que o cliente vê ao agendar — limpo e direto.", 42 * mm)

    # ========== 12 MENSAGENS PRONTAS ==========
    y = b.page()
    topbar(c, "Textos prontos")
    y = h1(c, "3 mensagens para copiar", y)
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
            "[Nome], amanhã às [hora] te esperamos. Se não puder vir, avisa até [horário limite] que eu chamo outra pessoa.",
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
        "Regra simples anti falta: quem não confirma, perde a preferência no horário nobre. Avise isso na marcação — não depois da briga.",
        y,
        10,
    )

    # ========== 13 FECHO ==========
    y = b.page()
    topbar(c, "Comece agora")
    y = h1(c, "Você já sabe o problema. Agora abre o sistema.", y, 20)
    y -= 4 * mm
    y = p(
        c,
        "Calcule o número da sua semana. Crie a conta. Publique o link de agendar. Em sete dias você compara de novo — e vê se a cadeira vazia diminuiu.",
        y,
        11,
    )
    y -= 6 * mm
    y = url_box(c, y, "CRIAR MINHA BARBEARIA", URL_CADASTRO)
    y = url_box(c, y, "ENTRAR NO PAINEL", URL_LOGIN)
    y = url_box(c, y, "VER PILOTO AO VIVO", URL_PILOTO)
    y -= 4 * mm
    card(c, M, y - 28 * mm, W - 2 * M, 28 * mm, ELEV, BLUE, 1.2)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 13)
    c.drawString(M + 4 * mm, y - 10 * mm, "Sua barbearia, sua cara — sem burocracia.")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 9)
    c.drawString(M + 4 * mm, y - 18 * mm, "Barbernegon · Vaga Perdida · guia prático")
    y -= 36 * mm
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(M, y, "Adapte as regras à sua casa. © Barbernegon")

    b.save()


if __name__ == "__main__":
    build()
