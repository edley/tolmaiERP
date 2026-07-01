import re
from typing import Optional


def extract_payment_data(text: str) -> dict:
    amount = extract_amount(text)
    payer_name = extract_payer_name(text)
    payer_email = extract_email(text)
    receipt_number = extract_receipt_number(text)
    payment_date = extract_date(text)

    return {
        "amount": amount,
        "currency": "USD",
        "payer_name": payer_name,
        "payer_email": payer_email,
        "receipt_number": receipt_number,
        "payment_date": payment_date,
        "raw_text_preview": text[:500],
    }


def extract_amount(text: str) -> Optional[float]:
    patterns = [
        r"(?:total|amount|sum|paid|due)[:\s]*\$?([\d,]+\.\d{2})",
        r"\$([\d,]+\.\d{2})",
        r"(?:total|amount|sum|paid|due)[:\s]*([\d,]+\.\d{2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1).replace(",", ""))
    return None


def extract_payer_name(text: str) -> Optional[str]:
    patterns = [
        r"(?:payer|customer|from|name)[:\s]*(.+?)[\n\r]",
        r"(?:paid by|submitted by)[:\s]*(.+?)[\n\r]",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def extract_email(text: str) -> Optional[str]:
    match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    return match.group(0) if match else None


def extract_receipt_number(text: str) -> Optional[str]:
    patterns = [
        r"(?:receipt|invoice|ref|reference|confirmation)[\s#:]*([A-Z0-9-]{5,20})",
        r"(?:receipt|invoice)\s*(?:no|number|#)[:\s]*([A-Z0-9-]{5,20})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def extract_date(text: str) -> Optional[str]:
    patterns = [
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
        r"(?:date|paid|payment)[:\s]*(\w+ \d{1,2},?\s*\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None
