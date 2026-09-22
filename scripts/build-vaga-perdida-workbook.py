#!/usr/bin/env python3
"""Workbook PDF Vaga Perdida — produto para preencher, não só ler."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path("/workspace")
SHOTS = ROOT / "docs/infoprodutos/screenshots"
OUT = ROOT / "docs/infoprodutos/vaga-perdida-workbook.pdf"
ARTIFACT = Path("/opt/cursor/artifacts/infoprodutos/vaga-perdida-workbook.pdf")

BG = (10 / 255, 14 / 255, 19 / 255)
BG2 = (15 / 255, 20 / 255, 25 / 255)
FG = (226 / 255, 234 / 255, 244 / 255)
MUTED = (168 / 255, 182 / 255, 201 / 255)
ACCENT = (59 / 255, 130 / 255, 246 / 255)
SOFT = (142 / 255, 182 / 255, 255 / 255)
OK = (52 / 255, 211 / 255, 153 / 255)
LINE = (30 / 255, 42 / 255, 58 / 255)
WARN = (245 / 255, 158 / 255, 11 / 255)

W, H = A4
M = 16 * mm


def fonts():
    reg = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    if Path(reg).exists():
        pdfmetrics.registerFont(TTFont("VP", reg))
        pdfmetrics.registerFont(TTFont("VPB", bold))
        return "VP", "VPB"
    return "Helvetica", "Helvetica-Bold"


F, FB = fonts()


def bg(c: canvas.Canvas, band=True):
    c.setFillColorRGB(*BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    if band:
        c.setFillColorRGB(*BG2)
        p = c.beginPath()
        p.moveTo(0, H)
        p.lineTo(W * 0.5, H)
        p.lineTo(0, H * 0.55)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    c.setFillColorRGB(*ACCENT)
    c.rect(0, H - 2.8 * mm, W, 2.8 * mm, fill=1, stroke=0)


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


def blank(c, x, y, w, h=9 * mm, label=""):
    c.setStrokeColorRGB(*LINE)
    c.setFillColorRGB(*BG2)
    c.setLineWidth(1)
    c.roundRect(x, y - h + 2 * mm, w, h, 3, fill=1, stroke=1)
    if label:
        c.setFillColorRGB(*MUTED)
        c.setFont(F, 7)
        c.drawString(x + 2 * mm, y + 1.5 * mm, label)
    return y - h - 2 * mm


def checkbox(c, x, y, label, size=4.2 * mm):
    c.setStrokeColorRGB(*SOFT)
    c.setLineWidth(1.2)
    c.rect(x, y - size + 1 * mm, size, size, fill=0, stroke=1)
    c.setFillColorRGB(*FG)
    c.setFont(F, 10)
    c.drawString(x + size + 3 * mm, y - 1.5 * mm, label)
    return y - 8 * mm


def shot(c, path: Path, y_top, caption, max_h=78 * mm):
    if not path.exists():
        return y_top - 10 * mm
    from PIL import Image

    im = Image.open(path)
    iw, ih = im.size
    max_w = W - 2 * M
    scale = min(max_w / iw, max_h / ih)
    dw, dh = iw * scale, ih * scale
    x = M + (max_w - dw) / 2
    y = y_top - dh
    pad = 1.8 * mm
    c.setFillColorRGB(*LINE)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 2.5, fill=1, stroke=0)
    c.setStrokeColorRGB(*ACCENT)
    c.setLineWidth(0.7)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 2.5, fill=0, stroke=1)
    c.drawImage(ImageReader(path), x, y, width=dw, height=dh, mask="auto")
    return wrap(c, caption, M, y - 4.5 * mm, max_w, F, 8, 10, MUTED, True)


def bar_demo(c, x, y, w, h, a=40, t=31):
    """Mini gráfico ilustrativo A vs T."""
    lost = max(a - t, 0)
    c.setFillColorRGB(*BG2)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=0)
    c.setStrokeColorRGB(*LINE)
    c.roundRect(x, y, w, h, 4, fill=0, stroke=1)
    bar_w = w * 0.28
    gap = w * 0.12
    base = y + 10 * mm
    max_bar = h - 22 * mm
    h_t = max_bar * (t / a if a else 0)
    h_l = max_bar * (lost / a if a else 0)
    bx = x + gap
    c.setFillColorRGB(*OK)
    c.roundRect(bx, base, bar_w, h_t, 3, fill=1, stroke=0)
    c.setFillColorRGB(*ACCENT)
    c.roundRect(bx + bar_w + gap, base, bar_w, h_l, 3, fill=1, stroke=0)
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawCentredString(bx + bar_w / 2, y + 4 * mm, "Atendidos")
    c.drawCentredString(bx + bar_w + gap + bar_w / 2, y + 4 * mm, "Perdidas")
    c.setFillColorRGB(*FG)
    c.setFont(FB, 9)
    c.drawString(x + 4 * mm, y + h - 7 * mm, "Exemplo visual · troque pelos seus números")


def build():
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    pages = 0

    def page():
        nonlocal pages
        if pages:
            c.showPage()
        pages += 1
        bg(c)
        return H - 16 * mm

    # 1 CAPA
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "PRODUTO BARBERNEGON · WORKBOOK · R$ 19,90")
    y -= 22 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 34)
    c.drawString(M, y, "Vaga Perdida")
    y -= 12 * mm
    y = wrap(
        c,
        "Workbook para calcular o estrago, marcar vazadouros e executar em 7 dias — com a marcação sob o controle da sua marca.",
        M,
        y,
        W - 2 * M,
        F,
        12,
        16,
        MUTED,
    )
    y -= 8 * mm
    c.setFillColorRGB(*ACCENT)
    c.rect(M, y, 26 * mm, 1.2 * mm, fill=1, stroke=0)
    y -= 12 * mm
    y = wrap(
        c,
        "Isto não é um PDF para folhear. É uma ferramenta: preencha, marque, copie scripts e meça de novo.",
        M,
        y,
        W - 2 * M,
        FB,
        11,
        15,
        FG,
    )
    y -= 10 * mm
    bar_demo(c, M, y - 55 * mm, W - 2 * M, 55 * mm)

    # 2 PROMESSA + PARA QUEM
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "COMECE AQUI")
    y -= 9 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 20)
    c.drawString(M, y, "Uma promessa. Uma semana.")
    y -= 8 * mm
    y = wrap(
        c,
        "Em 7 dias você calcula o estrago, fecha os vazamentos principais e deixa a agenda rodando com presença própria (site + marcação online).",
        M,
        y,
        W - 2 * M,
        F,
        11,
        15,
    )
    y -= 8 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M, y, "Este workbook é para você se…")
    y -= 7 * mm
    for t in [
        "Tem 1 unidade e poucos barbeiros",
        "A agenda “anda no WhatsApp”, mas sobra cadeira",
        "Quer número em R$, não discurso motivacional",
    ]:
        y = checkbox(c, M, y, t)
    y -= 4 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M, y, "Minha barbearia")
    y -= 3 * mm
    y = blank(c, M, y, W - 2 * M, label="Nome da casa")
    half = (W - 2 * M - 4 * mm) / 2
    y_row = y
    blank(c, M, y_row, half, label="Cidade")
    y = blank(c, M + half + 4 * mm, y_row, half, label="Nº de barbeiros")

    # 3 CONCEITO VISUAL
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "CONCEITO")
    y -= 9 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 20)
    c.drawString(M, y, "O que é vaga perdida")
    y -= 8 * mm
    y = wrap(
        c,
        "Qualquer horário que poderia ter gerado atendimento e não gerou — mesmo com gente pedindo horário.",
        M,
        y,
        W - 2 * M,
        F,
        11,
        15,
    )
    y -= 6 * mm
    # 5 boxes
    box_w = (W - 2 * M - 8 * mm) / 2
    items = [
        ("01", "No-show"),
        ("02", "Horário morto"),
        ("03", "Só WhatsApp"),
        ("04", "Marketplace"),
        ("05", "Sem cara digital"),
    ]
    for i, (n, t) in enumerate(items):
        col = i % 2
        row = i // 2
        x = M + col * (box_w + 8 * mm)
        yy = y - row * 22 * mm
        c.setFillColorRGB(*BG2)
        c.setStrokeColorRGB(*LINE)
        c.roundRect(x, yy - 16 * mm, box_w, 18 * mm, 4, fill=1, stroke=1)
        c.setFillColorRGB(*ACCENT)
        c.setFont(FB, 9)
        c.drawString(x + 3 * mm, yy - 5 * mm, n)
        c.setFillColorRGB(*FG)
        c.setFont(FB, 11)
        c.drawString(x + 3 * mm, yy - 12 * mm, t)
    y -= 58 * mm
    y = wrap(
        c,
        "Regra de ouro: cadeira vazia com demanda possível ≠ “dia fraco”. É vazão de operação.",
        M,
        y,
        W - 2 * M,
        FB,
        11,
        14,
        FG,
    )

    # 4 CALCULADORA WORKSHEET
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "FERRAMENTA · DIAGNÓSTICO")
    y -= 9 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 20)
    c.drawString(M, y, "Calculadora da semana")
    y -= 7 * mm
    y = wrap(
        c,
        "Pegue a última semana real. Preencha à mão (ou use a versão interativa em /produtos/vaga-perdida).",
        M,
        y,
        W - 2 * M,
        F,
        10,
        13,
    )
    y -= 4 * mm
    y = blank(c, M, y, W - 2 * M, 11 * mm, "A — horários abertos no expediente")
    y = blank(c, M, y, W - 2 * M, 11 * mm, "T — atendimentos realizados")
    y = blank(c, M, y, W - 2 * M, 11 * mm, "Ticket — preço do serviço mais vendido (R$)")
    y -= 3 * mm
    c.setFillColorRGB(*BG2)
    c.setStrokeColorRGB(*ACCENT)
    c.setLineWidth(1.2)
    c.roundRect(M, y - 38 * mm, W - 2 * M, 40 * mm, 5, fill=1, stroke=1)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M + 4 * mm, y - 6 * mm, "RESULTADO")
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M + 4 * mm, y - 14 * mm, "Vagas perdidas = A − T  →  ________")
    c.drawString(M + 4 * mm, y - 23 * mm, "R$ na mesa = (A − T) × Ticket  →  R$ ________")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(M + 4 * mm, y - 32 * mm, "Ex.: A40 · T31 · Ticket75 → 9 vagas · R$ 675 na semana")
    y -= 48 * mm
    y = shot(
        c,
        SHOTS / "S01-dashboard.png",
        y,
        "Painel real — o número que você calcular aqui é o que a operação precisa enxergar.",
        62 * mm,
    )

    # 5 VAZADOUROS WORKSHEET
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "DIAGNÓSTICO · CHECK")
    y -= 9 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 20)
    c.drawString(M, y, "Marque os vazadouros da casa")
    y -= 8 * mm
    for t in [
        "No-show — confirmação fraca",
        "Horário morto — buraco sem reposição",
        "Só WhatsApp — canal único",
        "Marketplace — hábito fora da marca",
        "Sem cara digital — compromisso fraco",
    ]:
        y = checkbox(c, M, y, t)
    y -= 2 * mm
    y = blank(c, M, y, W - 2 * M, 16 * mm, "O vazadouro nº 1 da minha casa é…")
    y -= 2 * mm
    y = shot(
        c,
        SHOTS / "S02-admin-reservas.png",
        y,
        "Grade de agendamentos (produção): onde a ocupação cai, a vaga some.",
        70 * mm,
    )

    # 6 PRINTS VAZADOUROS
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "PONTE BARBERNEGON")
    y -= 8 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 18)
    c.drawString(M, y, "Canal próprio + reposição")
    y -= 6 * mm
    y = shot(c, SHOTS / "S03-agendar.png", y, "Agenda online — cliente marca sem esperar resposta.", 55 * mm)
    y -= 3 * mm
    y = shot(c, SHOTS / "S04-admin-dia.png", y, "Operacional — buracos e a receber visíveis no dia.", 55 * mm)

    # 7 SITE
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "PRESENÇA PRÓPRIA")
    y -= 8 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 18)
    c.drawString(M, y, "Sua marca, não o app do vizinho")
    y -= 6 * mm
    y = shot(c, SHOTS / "S05-site-home.png", y, "Site white-label do piloto /ze-do-corte.", 72 * mm)
    y -= 2 * mm
    y = shot(c, SHOTS / "S06-site-servicos.png", y, "Identidade no canvas — não template genérico.", 55 * mm)

    # 8 MÉTODO + SCRIPTS
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "MÉTODO")
    y -= 9 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 20)
    c.drawString(M, y, "4 passos · preencha o seu plano")
    y -= 8 * mm
    steps = [
        ("A Padronizar", "Expediente / bloqueios / encaixes"),
        ("B Confirmar", "Marcação + véspera"),
        ("C Repor", "Lista de 10–20 flexíveis"),
        ("D Canal próprio", "Site + agenda online"),
    ]
    for title, hint in steps:
        c.setFillColorRGB(*FG)
        c.setFont(FB, 11)
        c.drawString(M, y, title)
        c.setFillColorRGB(*MUTED)
        c.setFont(F, 8)
        c.drawString(M + 42 * mm, y, hint)
        y -= 3 * mm
        y = blank(c, M, y, W - 2 * M, 10 * mm, "Como vou aplicar esta semana")
        y -= 1 * mm

    y -= 2 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M, y, "Scripts (copie para o WhatsApp)")
    y -= 6 * mm
    scripts = [
        "Marcação: Fala, [Nome]! Seu horário na [Barbearia] está marcado para [dia] às [hora]. Responde 1 confirmar / 2 remarcar.",
        "Véspera: [Nome], amanhã às [hora] te esperamos. Se não puder, avisa até [limite].",
        "Encaixe: Abriu vaga hoje às [hora] para [serviço]. Quer encaixar? Responde AGORA.",
    ]
    for s in scripts:
        y = wrap(c, s, M, y, W - 2 * M, F, 8, 11, MUTED)
        y -= 3 * mm

    # 9 CHECKLIST
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "EXECUÇÃO")
    y -= 9 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 20)
    c.drawString(M, y, "Checklist · 7 dias")
    y -= 8 * mm
    days = [
        "Dia 1 — Calculei A, T e R$ na mesa",
        "Dia 2 — Ajustei expediente e bloqueios",
        "Dia 3 — Salvei os 3 scripts",
        "Dia 4 — Montei lista de espera (10)",
        "Dia 5 — Publiquei regra anti no-show",
        "Dia 6 — Publiquei agenda com a cara da casa",
        "Dia 7 — Medi de novo e comparei",
    ]
    for d in days:
        y = checkbox(c, M, y, d)
        y -= 1 * mm
    y -= 4 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M, y, "Semana seguinte · novo cálculo")
    y -= 3 * mm
    y = blank(c, M, y, W - 2 * M, label="R$ deixado na mesa (semana 2)")
    y -= 4 * mm
    y = shot(c, SHOTS / "S07-agendar-form.png", y, "Cliente marca no navegador — você opera o painel.", 58 * mm)

    # 10 TOUR + CTA
    y = page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 9)
    c.drawString(M, y, "PRODUTO · BARBERNEGON")
    y -= 8 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 18)
    c.drawString(M, y, "Tire a agenda do improviso")
    y -= 6 * mm
    y = shot(c, SHOTS / "S12-piloto.png", y, "Piloto em produção — site + agenda na prática.", 68 * mm)
    y -= 2 * mm
    y = shot(c, SHOTS / "S11c-marca.png", y, "Identidade da marca no painel — slug, cores, redes.", 55 * mm)
    y -= 4 * mm
    c.setFillColorRGB(*ACCENT)
    c.roundRect(M, y - 14 * mm, W - 2 * M, 16 * mm, 4, fill=1, stroke=0)
    c.setFillColorRGB(*BG)
    c.setFont(FB, 12)
    c.drawCentredString(W / 2, y - 8 * mm, "Criar barbearia · /cadastro  ·  Experiência interativa · /produtos/vaga-perdida")

    # 11 CONTRACAPA
    y = page()
    c.setFillColorRGB(*FG)
    c.setFont(FB, 22)
    c.drawString(M, y, "Você já sabe onde a vaga some.")
    y -= 12 * mm
    y = wrap(
        c,
        "Agora execute o checklist. Use a calculadora interativa. Publique sua marca.",
        M,
        y,
        W - 2 * M,
        F,
        12,
        16,
    )
    y -= 10 * mm
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 10)
    c.drawString(M, y, "Barbernegon · Vaga Perdida")
    y -= 6 * mm
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 9)
    c.drawString(M, y, "Workbook + experiência web · material educativo de entrada")
    y -= 5 * mm
    c.drawString(M, y, "Adapte regras à sua operação. © Barbernegon")

    c.save()
    buf.seek(0)

    # footer stamp
    reader = PdfReader(buf)
    writer = PdfWriter()
    total = len(reader.pages)
    for i, page_obj in enumerate(reader.pages, start=1):
        packet = BytesIO()
        ov = canvas.Canvas(packet, pagesize=A4)
        ov.setFillColorRGB(*MUTED)
        ov.setFont(F, 8)
        ov.drawString(M, 9 * mm, "Vaga Perdida · workbook Barbernegon")
        ov.drawRightString(W - M, 9 * mm, f"{i} / {total}")
        ov.save()
        packet.seek(0)
        stamp = PdfReader(packet)
        page_obj.merge_page(stamp.pages[0])
        writer.add_page(page_obj)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "wb") as f:
        writer.write(f)
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_bytes(OUT.read_bytes())
    print(f"OK {OUT} pages={total} bytes={OUT.stat().st_size}")


if __name__ == "__main__":
    build()
