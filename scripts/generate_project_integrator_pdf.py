#!/usr/bin/env python3

from __future__ import annotations

import math
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    LongTable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Circle, Drawing, Ellipse, Line, Polygon, Rect, String


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"
OUTPUT_FILE = OUTPUT_DIR / "documentacao_projeto_integrador_canal_denuncias.pdf"

PROJECT_NAME = "Canal de Denuncias Psicossociais"
DOCUMENT_TITLE = "Documentacao do Projeto Integrador"
GENERATED_AT = date.today().strftime("%d/%m/%Y")

COLOR_NAVY = colors.HexColor("#17335C")
COLOR_BLUE = colors.HexColor("#245C9D")
COLOR_TEAL = colors.HexColor("#2F8FA3")
COLOR_LIGHT = colors.HexColor("#EAF2FB")
COLOR_LIGHTER = colors.HexColor("#F7FAFD")
COLOR_BORDER = colors.HexColor("#B8C9DD")
COLOR_TEXT = colors.HexColor("#263445")
COLOR_MUTED = colors.HexColor("#5A6B7F")
COLOR_SUCCESS = colors.HexColor("#2D6A4F")
COLOR_WARNING = colors.HexColor("#B16A1C")

FUNCTIONAL_REQUIREMENTS = [
    (
        "RF-01",
        "Criar denuncia",
        "Permitir registro anonimo ou identificado, com protocolo unico e imutavel gerado no backend.",
        "Campos obrigatorios: nome da empresa, setor, tipo da ocorrencia, descricao, local e data aproximada do fato quando informada. Se anonima=true, dados de identificacao devem ser persistidos como null.",
    ),
    (
        "RF-02",
        "Upload de evidencias",
        "Permitir anexar imagens opcionais como comprovacao da denuncia.",
        "Validar tipo de arquivo, tamanho maximo e rejeitar uploads fora das regras do bucket.",
    ),
    (
        "RF-03",
        "Acompanhamento por protocolo",
        "Permitir consulta publica do andamento da denuncia usando apenas o protocolo.",
        "A resposta publica deve exibir empresa, setor, status atual e historico cronologico sem vazar dados pessoais.",
    ),
    (
        "RF-04",
        "Gestao administrativa",
        "Disponibilizar area administrativa autenticada para triagem, consulta detalhada e tratamento da denuncia.",
        "O modulo admin existe no frontend, mas nao fica exposto na navegacao publica. Toda acao administrativa precisa ser auditavel.",
    ),
    (
        "RF-05",
        "Gestao de status",
        "Controlar a maquina de estados do caso: aberta -> em_analise -> resolvida.",
        "Apenas perfil administrativo altera status. A API bloqueia transicoes invalidas e exige ao menos uma tratativa antes de resolver o caso.",
    ),
    (
        "RF-06",
        "Historico imutavel",
        "Registrar criacao, anexos, tratativas, mudancas de status e eventos relevantes em historico append-only.",
        "Cada evento precisa guardar ator, timestamp e contexto minimo para auditoria.",
    ),
]

NON_FUNCTIONAL_REQUIREMENTS = [
    (
        "RNF-01",
        "Seguranca e anonimato",
        "HTTPS obrigatorio, autenticacao e autorizacao por perfil na area administrativa, sem identificacao obrigatoria para denuncia anonima.",
    ),
    (
        "RNF-02",
        "LGPD",
        "Fluxo deve informar finalidade e base legal, coletar apenas dados necessarios, restringir acesso por necessidade operacional e prever retencao e descarte.",
    ),
    (
        "RNF-03",
        "Performance",
        "Meta de p95 abaixo de 500 ms para operacoes sem upload. Upload deve responder em tempo compativel com a rede do usuario.",
    ),
    (
        "RNF-04",
        "Disponibilidade e operacao",
        "Frontend e backend em projeto unico na Vercel, com logs JSON, request_id por requisicao e monitoramento de falhas.",
    ),
    (
        "RNF-05",
        "Observabilidade",
        "Erros precisam ser investigaveis por logs estruturados sem expor dados pessoais sensiveis.",
    ),
    (
        "RNF-06",
        "Usabilidade",
        "Interface simples, objetiva e com aparencia academica. O MVP nao busca acabamento premium, mas precisa manter clareza operacional.",
    ),
    (
        "RNF-07",
        "Qualidade e QA",
        "Cobertura minima para criacao de denuncia, consulta por protocolo, autorizacao admin, validacao de input e regressao do fluxo de status.",
    ),
]

COST_ASSUMPTIONS = [
    "1 projeto Vercel e 1 projeto Supabase para o MVP.",
    "Baixo volume de anexos, somente imagens.",
    "Sem app mobile nativo, sem IA e sem integracoes externas no MVP.",
    "Estimativa baseada em precos oficiais consultados em 23/03/2026.",
    "Valores em USD, sem considerar cambio, IOF e custos de equipe.",
]

COST_SCENARIOS = [
    (
        "Demo academica",
        "Vercel Hobby",
        "Supabase Free",
        "USD 0/mes",
        "Viavel para apresentacao, prototipo e validacao de fluxo. Nao e a melhor base para operacao publica de um canal sensivel.",
    ),
    (
        "MVP publico recomendado",
        "Vercel Pro: USD 20/mes + uso excedente",
        "Supabase Pro: USD 25/mes base",
        "USD 45/mes base",
        "E o ponto minimo razoavel para operar com menos risco de pausa por quota, melhor governanca de custo e margem para crescer.",
    ),
]

COST_NOTES = [
    "Vercel Pro inclui USD 20 de usage credit e passa a cobrar excedente conforme trafego, funcoes e transferencia.",
    "Supabase Pro inclui quota organizacional e USD 10 de compute credits, suficiente para 1 projeto em compute Nano ou Micro.",
    "Se o volume crescer, os custos sobem primeiro por egress, storage e funcoes. Nao faz sentido estimar custo fixo alto sem medir uso real.",
]

COST_REFERENCES = [
    "Vercel Pricing: https://vercel.com/pricing",
    "Supabase Billing FAQ: https://supabase.com/docs/guides/platform/billing-faq",
    "Supabase About Billing: https://supabase.com/docs/guides/platform/billing-on-supabase",
]

DATA_DICTIONARY = [
    {
        "table": "usuarios_admin",
        "description": "Usuarios com acesso ao modulo administrativo para triagem, investigacao e gestao de status.",
        "columns": [
            ("id", "uuid", "Nao", "PK. Identificador unico com default gen_random_uuid()."),
            ("nome", "varchar(120)", "Nao", "Nome do usuario administrativo."),
            ("email", "varchar(180)", "Nao", "Email unico usado para autenticacao e identificacao operacional."),
            ("perfil", "varchar(40)", "Nao", "Perfil de autorizacao do usuario."),
            ("ativo", "boolean", "Nao", "Indica se o usuario pode operar no sistema. Default true."),
            ("created_at", "timestamptz", "Nao", "Data e hora de criacao do registro."),
        ],
        "rules": [
            "Unique em email.",
            "Referenciado por historico_denuncia.ator_id e tratativas.admin_id.",
        ],
    },
    {
        "table": "denuncias",
        "description": "Entidade principal do dominio. Armazena a denuncia, o protocolo e o status do caso.",
        "columns": [
            ("id", "uuid", "Nao", "PK. Identificador unico da denuncia."),
            ("protocolo", "varchar(40)", "Nao", "Codigo unico e imutavel para consulta publica."),
            ("anonima", "boolean", "Nao", "Define se a denuncia e anonima ou identificada."),
            ("nome_denunciante", "varchar(140)", "Sim", "Nome do denunciante quando a denuncia nao for anonima."),
            ("email_denunciante", "varchar(180)", "Sim", "Email do denunciante quando aplicavel."),
            ("nome_empresa", "varchar(160)", "Nao", "Empresa relacionada ao fato denunciado."),
            ("setor", "varchar(120)", "Nao", "Setor ou area onde ocorreu a situacao."),
            ("descricao", "text", "Nao", "Descricao detalhada da ocorrencia."),
            ("tipo_ocorrencia", "varchar(120)", "Nao", "Categoria da ocorrencia psicossocial."),
            ("local", "varchar(160)", "Nao", "Local fisico ou contexto do fato."),
            ("data_ocorrencia_aprox", "date", "Sim", "Data aproximada do ocorrido, quando informada."),
            ("status", "denuncia_status", "Nao", "Estado atual do caso: aberta, em_analise ou resolvida."),
            ("created_at", "timestamptz", "Nao", "Data e hora de criacao."),
            ("updated_at", "timestamptz", "Nao", "Data e hora da ultima atualizacao."),
        ],
        "rules": [
            "Unique em protocolo.",
            "Constraint ck_denuncias_identificacao impede identificar denuncias anonimas.",
            "Trigger trg_denuncias_updated_at atualiza updated_at automaticamente.",
            "Indice idx_denuncias_status_created_at para listagem administrativa.",
        ],
    },
    {
        "table": "anexos_denuncia",
        "description": "Metadados dos arquivos de imagem enviados como evidencia da denuncia.",
        "columns": [
            ("id", "uuid", "Nao", "PK. Identificador unico do anexo."),
            ("denuncia_id", "uuid", "Nao", "FK para denuncias.id."),
            ("arquivo_url", "text", "Nao", "URL do arquivo armazenado no Supabase Storage."),
            ("arquivo_nome", "varchar(240)", "Nao", "Nome original ou normalizado do arquivo."),
            ("mime_type", "varchar(80)", "Nao", "Tipo MIME validado no upload."),
            ("created_at", "timestamptz", "Nao", "Data e hora da inclusao do anexo."),
        ],
        "rules": [
            "FK com on delete cascade para remover anexos ao excluir a denuncia.",
        ],
    },
    {
        "table": "tratativas",
        "description": "Registros textuais das acoes administrativas executadas durante a investigacao do caso.",
        "columns": [
            ("id", "uuid", "Nao", "PK. Identificador unico da tratativa."),
            ("denuncia_id", "uuid", "Nao", "FK para denuncias.id."),
            ("admin_id", "uuid", "Sim", "FK para usuarios_admin.id. Pode ficar nulo em cenarios auditados sem vinculo direto."),
            ("descricao", "text", "Nao", "Descricao da tratativa registrada pela equipe."),
            ("created_at", "timestamptz", "Nao", "Data e hora do registro."),
        ],
        "rules": [
            "FK denuncia_id com on delete cascade.",
            "FK admin_id com on delete set null.",
            "Regras de negocio bloqueiam novas tratativas em denuncia resolvida.",
        ],
    },
    {
        "table": "historico_denuncia",
        "description": "Timeline imutavel de eventos relevantes do caso para auditoria e consulta por protocolo.",
        "columns": [
            ("id", "uuid", "Nao", "PK. Identificador unico do evento."),
            ("denuncia_id", "uuid", "Nao", "FK para denuncias.id."),
            ("evento", "varchar(80)", "Nao", "Tipo do evento, como denuncia_criada ou status_alterado."),
            ("detalhes", "text", "Sim", "Contexto resumido do evento registrado."),
            ("ator_tipo", "varchar(20)", "Nao", "Origem do evento: sistema, admin ou equivalente."),
            ("ator_id", "uuid", "Sim", "FK opcional para usuarios_admin.id."),
            ("created_at", "timestamptz", "Nao", "Data e hora do evento."),
        ],
        "rules": [
            "FK denuncia_id com on delete cascade.",
            "FK ator_id com on delete set null.",
            "Indice idx_historico_denuncia_denuncia_created_at para timeline.",
            "Triggers append-only bloqueiam UPDATE e DELETE.",
        ],
    },
]


def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles: dict[str, ParagraphStyle] = {}

    styles["cover_title"] = ParagraphStyle(
        "cover_title",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=28,
        textColor=COLOR_NAVY,
        alignment=TA_CENTER,
        spaceAfter=14,
    )
    styles["cover_subtitle"] = ParagraphStyle(
        "cover_subtitle",
        parent=base["Heading2"],
        fontName="Helvetica",
        fontSize=11,
        leading=16,
        textColor=COLOR_MUTED,
        alignment=TA_CENTER,
        spaceAfter=10,
    )
    styles["section"] = ParagraphStyle(
        "section",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=20,
        textColor=COLOR_NAVY,
        spaceBefore=8,
        spaceAfter=10,
    )
    styles["subsection"] = ParagraphStyle(
        "subsection",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=COLOR_BLUE,
        spaceBefore=6,
        spaceAfter=6,
    )
    styles["body"] = ParagraphStyle(
        "body",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=COLOR_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    styles["body_small"] = ParagraphStyle(
        "body_small",
        parent=styles["body"],
        fontSize=8.5,
        leading=12,
        spaceAfter=4,
    )
    styles["center_note"] = ParagraphStyle(
        "center_note",
        parent=styles["body_small"],
        alignment=TA_CENTER,
        textColor=COLOR_MUTED,
    )
    styles["list_item"] = ParagraphStyle(
        "list_item",
        parent=styles["body"],
        leftIndent=12,
        firstLineIndent=-10,
        spaceAfter=4,
    )
    styles["table"] = ParagraphStyle(
        "table",
        parent=styles["body_small"],
        fontSize=8.2,
        leading=11,
    )
    styles["caption"] = ParagraphStyle(
        "caption",
        parent=styles["body_small"],
        alignment=TA_CENTER,
        textColor=COLOR_MUTED,
        spaceBefore=3,
        spaceAfter=10,
    )

    return styles


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullet_items(items: list[str], style: ParagraphStyle) -> list[Paragraph]:
    return [p(f"- {item}", style) for item in items]


def make_box_table(rows, col_widths, header_bg=COLOR_NAVY, repeat_rows=1, long=False):
    table_cls = LongTable if long else Table
    table = table_cls(rows, colWidths=col_widths, repeatRows=repeat_rows, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), header_bg),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
                ("TOPPADDING", (0, 0), (-1, 0), 7),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [COLOR_LIGHTER, colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 1), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
            ]
        )
    )
    return table


def add_arrow(drawing: Drawing, x1: float, y1: float, x2: float, y2: float, label: str | None = None) -> None:
    drawing.add(Line(x1, y1, x2, y2, strokeColor=COLOR_BLUE, strokeWidth=1.2))
    angle = math.atan2(y2 - y1, x2 - x1)
    size = 7
    left_x = x2 - size * math.cos(angle - math.pi / 6)
    left_y = y2 - size * math.sin(angle - math.pi / 6)
    right_x = x2 - size * math.cos(angle + math.pi / 6)
    right_y = y2 - size * math.sin(angle + math.pi / 6)
    drawing.add(
        Polygon(
            [x2, y2, left_x, left_y, right_x, right_y],
            fillColor=COLOR_BLUE,
            strokeColor=COLOR_BLUE,
        )
    )
    if label:
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2 + 6
        drawing.add(String(mid_x, mid_y, label, fontName="Helvetica", fontSize=7, fillColor=COLOR_MUTED))


def add_relation(drawing: Drawing, x1: float, y1: float, x2: float, y2: float, label: str | None = None) -> None:
    drawing.add(Line(x1, y1, x2, y2, strokeColor=COLOR_BLUE, strokeWidth=1.1))
    if label:
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2 + 6
        drawing.add(String(mid_x, mid_y, label, fontName="Helvetica", fontSize=7, fillColor=COLOR_MUTED))


def add_multiline_centered_text(
    drawing: Drawing,
    center_x: float,
    center_y: float,
    lines: list[str],
    font_size: float = 8,
    color=COLOR_TEXT,
) -> None:
    line_gap = font_size + 2
    total_height = len(lines) * line_gap
    start_y = center_y + total_height / 2 - font_size
    for index, line in enumerate(lines):
        width = len(line) * (font_size * 0.3)
        drawing.add(
            String(
                center_x - width,
                start_y - index * line_gap,
                line,
                fontName="Helvetica",
                fontSize=font_size,
                fillColor=color,
            )
        )


def add_actor(drawing: Drawing, x: float, y: float, label: str) -> None:
    drawing.add(Circle(x, y + 24, 8, strokeColor=COLOR_NAVY, fillColor=None, strokeWidth=1.2))
    drawing.add(Line(x, y + 16, x, y - 10, strokeColor=COLOR_NAVY, strokeWidth=1.2))
    drawing.add(Line(x - 12, y + 8, x + 12, y + 8, strokeColor=COLOR_NAVY, strokeWidth=1.2))
    drawing.add(Line(x, y - 10, x - 10, y - 26, strokeColor=COLOR_NAVY, strokeWidth=1.2))
    drawing.add(Line(x, y - 10, x + 10, y - 26, strokeColor=COLOR_NAVY, strokeWidth=1.2))
    drawing.add(String(x - 20, y - 42, label, fontName="Helvetica-Bold", fontSize=8, fillColor=COLOR_TEXT))


def add_use_case(drawing: Drawing, x: float, y: float, w: float, h: float, lines: list[str]) -> None:
    drawing.add(Ellipse(x + w / 2, y + h / 2, w / 2, h / 2, strokeColor=COLOR_TEAL, fillColor=COLOR_LIGHT, strokeWidth=1.2))
    add_multiline_centered_text(drawing, x + w / 2, y + h / 2, lines, font_size=8)


def add_class_box(drawing: Drawing, x: float, y: float, w: float, title: str, lines: list[str], band_color=COLOR_NAVY) -> None:
    line_height = 10
    title_height = 18
    padding = 6
    total_height = title_height + padding + line_height * len(lines) + 6
    drawing.add(Rect(x, y, w, total_height, strokeColor=COLOR_BORDER, fillColor=colors.white, strokeWidth=1))
    drawing.add(Rect(x, y + total_height - title_height, w, title_height, strokeColor=band_color, fillColor=band_color, strokeWidth=1))
    drawing.add(String(x + 6, y + total_height - 13, title, fontName="Helvetica-Bold", fontSize=8.2, fillColor=colors.white))
    text_y = y + total_height - title_height - 10
    for line in lines:
        drawing.add(String(x + 6, text_y, line, fontName="Helvetica", fontSize=7.2, fillColor=COLOR_TEXT))
        text_y -= line_height


def add_entity_box(drawing: Drawing, x: float, y: float, w: float, title: str, lines: list[str]) -> None:
    add_class_box(drawing, x, y, w, title, lines, band_color=COLOR_BLUE)


def use_case_diagram() -> Drawing:
    d = Drawing(470, 280)
    d.add(Rect(0, 0, 470, 280, strokeColor=COLOR_BORDER, fillColor=COLOR_LIGHTER, strokeWidth=0.8))

    add_actor(d, 40, 175, "Denunciante")
    add_actor(d, 430, 175, "Admin/Analista")

    use_cases_left = [
        (115, 205, ["Criar", "denuncia"]),
        (115, 150, ["Anexar", "evidencia"]),
        (115, 95, ["Acompanhar", "por protocolo"]),
    ]
    for x, y, label in use_cases_left:
        add_use_case(d, x, y, 125, 34, label)
        add_relation(d, 52, 175, x, y + 17)

    use_cases_right = [
        (255, 220, ["Autenticar", "modulo admin"]),
        (255, 175, ["Consultar", "detalhe e historico"]),
        (255, 130, ["Atualizar", "status"]),
        (255, 85, ["Registrar", "tratativa"]),
        (255, 40, ["Auditar", "eventos"]),
    ]
    for x, y, label in use_cases_right:
        add_use_case(d, x, y, 145, 32, label)
        add_relation(d, x + 145, y + 16, 418, 175)
    return d


def activity_diagram() -> Drawing:
    d = Drawing(470, 390)
    d.add(Rect(0, 0, 470, 390, strokeColor=COLOR_BORDER, fillColor=COLOR_LIGHTER, strokeWidth=0.8))

    def action(x, y, w, h, text_lines):
        d.add(Rect(x, y, w, h, rx=8, ry=8, strokeColor=COLOR_TEAL, fillColor=colors.white, strokeWidth=1.1))
        add_multiline_centered_text(d, x + w / 2, y + h / 2, text_lines, font_size=8)

    def decision(x, y, w, h, text_lines):
        points = [x + w / 2, y + h, x + w, y + h / 2, x + w / 2, y, x, y + h / 2]
        d.add(Polygon(points, strokeColor=COLOR_BLUE, fillColor=COLOR_LIGHT, strokeWidth=1.1))
        add_multiline_centered_text(d, x + w / 2, y + h / 2, text_lines, font_size=8)

    d.add(Circle(235, 363, 7, strokeColor=COLOR_NAVY, fillColor=COLOR_NAVY))
    action(160, 323, 150, 28, ["Preencher denuncia"])
    action(160, 280, 150, 28, ["Validar payload e anexos"])
    decision(184, 227, 102, 38, ["Dados", "validos?"])
    action(20, 227, 120, 38, ["Exibir erros e", "solicitar ajuste"])
    action(155, 172, 160, 34, ["Persistir denuncia", "e gerar protocolo"])
    action(155, 125, 160, 34, ["Triagem admin e", "registro de tratativa"])
    decision(184, 72, 102, 38, ["Caso pode", "ser resolvido?"])
    action(330, 72, 110, 38, ["Manter", "em_analise"])
    action(155, 18, 160, 34, ["Atualizar status", "para resolvida"])
    d.add(Circle(235, 4, 7, strokeColor=COLOR_SUCCESS, fillColor=COLOR_SUCCESS))

    add_arrow(d, 235, 356, 235, 351)
    add_arrow(d, 235, 323, 235, 308)
    add_arrow(d, 235, 280, 235, 265)
    add_arrow(d, 235, 227, 235, 206)
    add_arrow(d, 184, 246, 140, 246, "nao")
    add_arrow(d, 140, 246, 140, 337)
    add_arrow(d, 140, 337, 160, 337)
    add_arrow(d, 235, 227, 235, 206, "sim")
    add_arrow(d, 235, 172, 235, 159)
    add_arrow(d, 235, 125, 235, 110)
    add_arrow(d, 235, 72, 235, 52, "sim")
    add_arrow(d, 286, 91, 330, 91, "nao")
    add_arrow(d, 330, 91, 330, 188)
    add_arrow(d, 330, 188, 315, 189)
    add_arrow(d, 235, 18, 235, 11)
    d.add(String(18, 363, "Fluxo principal do caso", fontName="Helvetica-Bold", fontSize=8, fillColor=COLOR_MUTED))
    return d


def class_diagram() -> Drawing:
    d = Drawing(470, 320)
    d.add(Rect(0, 0, 470, 320, strokeColor=COLOR_BORDER, fillColor=COLOR_LIGHTER, strokeWidth=0.8))

    add_class_box(
        d,
        20,
        175,
        170,
        "Denuncia",
        [
            "id: uuid",
            "protocolo: varchar(40)",
            "anonima: boolean",
            "nome_empresa: varchar(160)",
            "setor: varchar(120)",
            "tipo_ocorrencia: varchar(120)",
            "local: varchar(160)",
            "status: denuncia_status",
        ],
    )
    add_class_box(
        d,
        20,
        55,
        170,
        "Anexo",
        [
            "id: uuid",
            "denuncia_id: uuid",
            "arquivo_nome: varchar(240)",
            "mime_type: varchar(80)",
            "arquivo_url: text",
        ],
    )
    add_class_box(
        d,
        195,
        50,
        155,
        "Historico",
        [
            "id: uuid",
            "denuncia_id: uuid",
            "evento: varchar(80)",
            "ator_tipo: varchar(20)",
            "ator_id: uuid",
            "created_at: timestamptz",
        ],
    )
    add_class_box(
        d,
        300,
        205,
        145,
        "UsuarioAdmin",
        [
            "id: uuid",
            "nome: varchar(120)",
            "email: varchar(180)",
            "perfil: varchar(40)",
            "ativo: boolean",
        ],
    )
    add_class_box(
        d,
        300,
        105,
        145,
        "Tratativa",
        [
            "id: uuid",
            "denuncia_id: uuid",
            "admin_id: uuid",
            "descricao: text",
            "created_at: timestamptz",
        ],
    )

    add_relation(d, 105, 175, 105, 120, "1 : 0..*")
    add_relation(d, 190, 205, 300, 225, "1 : 0..*")
    add_relation(d, 190, 193, 300, 140, "1 : 0..*")
    add_relation(d, 372, 205, 372, 156, "1 : 0..*")
    add_relation(d, 345, 205, 345, 154, "1 : 0..*")
    return d


def er_diagram() -> Drawing:
    d = Drawing(470, 330)
    d.add(Rect(0, 0, 470, 330, strokeColor=COLOR_BORDER, fillColor=COLOR_LIGHTER, strokeWidth=0.8))

    add_entity_box(
        d,
        20,
        195,
        180,
        "denuncias",
        [
            "PK id",
            "protocolo (unique)",
            "anonima",
            "nome_empresa",
            "setor",
            "tipo_ocorrencia",
            "local",
            "status",
        ],
    )
    add_entity_box(
        d,
        20,
        75,
        180,
        "anexos_denuncia",
        [
            "PK id",
            "FK denuncia_id",
            "arquivo_nome",
            "mime_type",
            "arquivo_url",
        ],
    )
    add_entity_box(
        d,
        245,
        90,
        180,
        "historico_denuncia",
        [
            "PK id",
            "FK denuncia_id",
            "evento",
            "ator_tipo",
            "FK ator_id",
            "created_at",
        ],
    )
    add_entity_box(
        d,
        245,
        205,
        180,
        "usuarios_admin",
        [
            "PK id",
            "email (unique)",
            "nome",
            "perfil",
            "ativo",
        ],
    )
    add_entity_box(
        d,
        245,
        10,
        180,
        "tratativas",
        [
            "PK id",
            "FK denuncia_id",
            "FK admin_id",
            "descricao",
            "created_at",
        ],
    )

    add_relation(d, 110, 195, 110, 140, "1 : N")
    add_relation(d, 200, 230, 245, 170, "1 : N")
    add_relation(d, 200, 212, 245, 65, "1 : N")
    add_relation(d, 335, 205, 335, 165, "1 : N")
    add_relation(d, 335, 205, 335, 85, "1 : N")
    return d


def cover_box(styles: dict[str, ParagraphStyle]) -> Table:
    info_rows = [
        [p("<b>Projeto</b>", styles["table"]), p(PROJECT_NAME, styles["table"])],
        [p("<b>Documento</b>", styles["table"]), p(DOCUMENT_TITLE, styles["table"])],
        [p("<b>Base</b>", styles["table"]), p("PRD.md e especificacoes tecnicas do repositorio", styles["table"])],
        [p("<b>Excecoes</b>", styles["table"]), p("Revisao bibliografica e escopo foram omitidos conforme solicitacao.", styles["table"])],
        [p("<b>Gerado em</b>", styles["table"]), p(GENERATED_AT, styles["table"])],
    ]
    table = Table(info_rows, colWidths=[3.2 * cm, 11.5 * cm], hAlign="CENTER")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, COLOR_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [COLOR_LIGHTER, colors.white]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def build_story(styles: dict[str, ParagraphStyle]):
    story = []

    story.append(Spacer(1, 2.8 * cm))
    story.append(p(DOCUMENT_TITLE, styles["cover_title"]))
    story.append(p(PROJECT_NAME, styles["cover_subtitle"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(cover_box(styles))
    story.append(Spacer(1, 0.8 * cm))
    story.append(
        p(
            "Este documento consolida os artefatos exigidos para a entrega academica do sistema de canal de denuncias. "
            "O foco esta nos requisitos, custo operacional do MVP, diagramas de modelagem e dicionario de dados relacional.",
            styles["body"],
        )
    )
    story.extend(bullet_items(
        [
            "Fluxo principal: denuncia, triagem, tratativa, historico e acompanhamento por protocolo.",
            "Persistencia relacional em Supabase PostgreSQL, com anexos em Storage.",
            "Premissa de simplicidade: sem overengineering e sem itens fora do MVP definido.",
        ],
        styles["list_item"],
    ))
    story.append(PageBreak())

    story.append(p("1. Requisitos Funcionais", styles["section"]))
    story.append(
        p(
            "Os requisitos funcionais abaixo foram consolidados a partir do PRD e dos contratos ja definidos para o backend.",
            styles["body"],
        )
    )
    rf_rows = [[p("ID", styles["table"]), p("Funcionalidade", styles["table"]), p("Descricao", styles["table"]), p("Regras relevantes", styles["table"])]]
    for req_id, title, desc, rules in FUNCTIONAL_REQUIREMENTS:
        rf_rows.append(
            [
                p(req_id, styles["table"]),
                p(f"<b>{title}</b>", styles["table"]),
                p(desc, styles["table"]),
                p(rules, styles["table"]),
            ]
        )
    story.append(make_box_table(rf_rows, [1.5 * cm, 4.1 * cm, 5.6 * cm, 5.3 * cm], long=True))
    story.append(Spacer(1, 0.45 * cm))

    story.append(p("2. Requisitos Nao Funcionais", styles["section"]))
    rnf_rows = [[p("ID", styles["table"]), p("Categoria", styles["table"]), p("Diretriz consolidada", styles["table"])]]
    for req_id, category, description in NON_FUNCTIONAL_REQUIREMENTS:
        rnf_rows.append([p(req_id, styles["table"]), p(f"<b>{category}</b>", styles["table"]), p(description, styles["table"])])
    story.append(make_box_table(rnf_rows, [1.8 * cm, 4.7 * cm, 10.0 * cm], header_bg=COLOR_BLUE, long=True))
    story.append(Spacer(1, 0.45 * cm))

    story.append(p("3. Estimativa de Custo", styles["section"]))
    story.append(
        p(
            "A estimativa de custo precisa separar demonstracao academica de operacao real. Misturar os dois cenarios gera uma previsao fraca e tecnicamente enganosa.",
            styles["body"],
        )
    )
    story.append(p("3.1 Premissas adotadas", styles["subsection"]))
    story.extend(bullet_items(COST_ASSUMPTIONS, styles["list_item"]))
    story.append(Spacer(1, 0.15 * cm))
    story.append(p("3.2 Cenarios de custo mensal", styles["subsection"]))
    cost_rows = [
        [
            p("Cenario", styles["table"]),
            p("Vercel", styles["table"]),
            p("Supabase", styles["table"]),
            p("Total base", styles["table"]),
            p("Leitura tecnica", styles["table"]),
        ]
    ]
    for row in COST_SCENARIOS:
        cost_rows.append([p(cell, styles["table"]) for cell in row])
    story.append(make_box_table(cost_rows, [3.0 * cm, 3.6 * cm, 3.4 * cm, 2.2 * cm, 4.8 * cm], header_bg=COLOR_TEAL, long=True))
    story.append(Spacer(1, 0.2 * cm))
    story.extend(bullet_items(COST_NOTES, styles["list_item"]))
    story.append(p("3.3 Referencias de preco", styles["subsection"]))
    story.extend(bullet_items(COST_REFERENCES, styles["list_item"]))
    story.append(PageBreak())

    story.append(p("4. Diagramas de Caso de Uso", styles["section"]))
    story.append(
        p(
            "O diagrama abaixo resume as interacoes principais entre o denunciante e o modulo administrativo do sistema.",
            styles["body"],
        )
    )
    story.append(use_case_diagram())
    story.append(p("Figura 1 - Diagrama de caso de uso do MVP.", styles["caption"]))
    story.append(PageBreak())

    story.append(p("5. Diagramas de Atividades", styles["section"]))
    story.append(
        p(
            "O fluxo de atividade sintetiza o processamento da denuncia desde a submissao ate a resolucao do caso.",
            styles["body"],
        )
    )
    story.append(activity_diagram())
    story.append(p("Figura 2 - Diagrama de atividades do fluxo principal.", styles["caption"]))
    story.append(PageBreak())

    story.append(p("6. Diagramas de Classes", styles["section"]))
    story.append(
        p(
            "O modelo de classes conceitual representa as entidades centrais do dominio e suas associacoes principais.",
            styles["body"],
        )
    )
    story.append(class_diagram())
    story.append(p("Figura 3 - Diagrama de classes conceitual.", styles["caption"]))
    story.append(PageBreak())

    story.append(p("7. Modelo Entidade Relacionamento", styles["section"]))
    story.append(
        p(
            "Como o projeto adota Supabase PostgreSQL, o item de modelo entidade relacionamento e aplicavel e deve constar na documentacao.",
            styles["body"],
        )
    )
    story.append(er_diagram())
    story.append(p("Figura 4 - Modelo ER simplificado para banco relacional.", styles["caption"]))
    story.append(PageBreak())

    story.append(p("8. Dicionario de Dados", styles["section"]))
    story.append(
        p(
            "O dicionario abaixo descreve a estrutura minima do banco relacional do MVP, incluindo tipos, obrigatoriedade e regras mais relevantes.",
            styles["body"],
        )
    )

    for item in DATA_DICTIONARY:
        story.append(p(f"8.{DATA_DICTIONARY.index(item) + 1} Tabela {item['table']}", styles["subsection"]))
        story.append(p(item["description"], styles["body"]))
        rows = [[p("Campo", styles["table"]), p("Tipo", styles["table"]), p("Nulo", styles["table"]), p("Descricao", styles["table"])]]
        for col in item["columns"]:
            rows.append([p(col[0], styles["table"]), p(col[1], styles["table"]), p(col[2], styles["table"]), p(col[3], styles["table"])])
        story.append(make_box_table(rows, [3.2 * cm, 3.0 * cm, 1.5 * cm, 8.8 * cm], header_bg=COLOR_BLUE, long=True))
        story.append(Spacer(1, 0.15 * cm))
        story.extend(bullet_items(item["rules"], styles["list_item"]))
        story.append(Spacer(1, 0.25 * cm))

    story.append(Spacer(1, 0.35 * cm))
    story.append(
        p(
            "Conclusao: a base documental acima cobre os itens solicitados na imagem de orientacao, excluindo apenas revisao bibliografica e escopo do projeto, conforme pedido.",
            styles["body"],
        )
    )

    return story


def draw_header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setStrokeColor(COLOR_BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(doc.leftMargin, height - 1.5 * cm, width - doc.rightMargin, height - 1.5 * cm)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.setFillColor(COLOR_NAVY)
        canvas.drawString(doc.leftMargin, height - 1.18 * cm, PROJECT_NAME)
    canvas.setStrokeColor(COLOR_BORDER)
    canvas.setLineWidth(0.6)
    canvas.line(doc.leftMargin, 1.5 * cm, width - doc.rightMargin, 1.5 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(COLOR_MUTED)
    canvas.drawString(doc.leftMargin, 1.05 * cm, f"Documento consolidado - gerado em {GENERATED_AT}")
    canvas.drawRightString(width - doc.rightMargin, 1.05 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


def build_pdf():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.1 * cm,
        bottomMargin=2.0 * cm,
        title=DOCUMENT_TITLE,
        author="Codex",
    )
    doc.build(build_story(styles), onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)


if __name__ == "__main__":
    build_pdf()
