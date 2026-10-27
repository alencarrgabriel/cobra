"""Builds a small text PDF for tests (no network, no extra dependency)."""


def make_pdf(pages: list[str]) -> bytes:
    """One page per string, Helvetica, WinAnsi encoding (accents allowed)."""
    objects: list[bytes] = []
    kids = []
    font_id = 3 + 2 * len(pages)
    for i, text in enumerate(pages):
        page_id, content_id = 3 + 2 * i, 4 + 2 * i
        kids.append(f"{page_id} 0 R")
        escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream = f"BT /F1 11 Tf 40 760 Td ({escaped}) Tj ET".encode("cp1252")
        objects.append(
            f"{page_id} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >> "
            "endobj\n".encode()
        )
        objects.append(
            f"{content_id} 0 obj << /Length {len(stream)} >> stream\n".encode()
            + stream
            + b"\nendstream endobj\n"
        )
    head = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        (
            f"2 0 obj << /Type /Pages /Kids [{' '.join(kids)}] /Count {len(pages)} >> endobj\n"
        ).encode(),
    ]
    font = (
        f"{font_id} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica "
        "/Encoding /WinAnsiEncoding >> endobj\n".encode()
    )
    body = b"%PDF-1.4\n"
    offsets = []
    for obj in [*head, *objects, font]:
        offsets.append(len(body))
        body += obj
    xref = len(body)
    body += f"xref\n0 {len(offsets) + 1}\n0000000000 65535 f \n".encode()
    body += b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
    body += (
        f"trailer << /Size {len(offsets) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return body
