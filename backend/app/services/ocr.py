import io
import pdfplumber
from PIL import Image
import pytesseract
from app.config import settings


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n".join(text_parts)


def ocr_pdf_with_tesseract(pdf_bytes: bytes) -> str:
    pytesseract.pytesseract.tesseract_cmd = settings.tesseract_path
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            img = page.to_image(resolution=300)
            pil_img = img.original
            text = pytesseract.image_to_string(pil_img)
            text_parts.append(text)
    return "\n".join(text_parts)


def get_pdf_text(pdf_bytes: bytes) -> str:
    text = extract_text_from_pdf(pdf_bytes)
    if text and text.strip():
        return text
    return ocr_pdf_with_tesseract(pdf_bytes)
