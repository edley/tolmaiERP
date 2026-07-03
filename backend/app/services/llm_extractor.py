import json
from openai import OpenAI
from app.config import settings

SYSTEM_PROMPT = """You are a payment receipt extractor. Given raw OCR text from a bank payment confirmation PDF, extract structured data as JSON.

Extract these fields:
- amount (float, required)
- currency (string, e.g. "MUR", "USD", "EUR")
- payer_name (string, the recipient / "Transfer to" / payee name)
- bank_issuer (string, the bank that issued this confirmation, e.g. "MCB Ltd", "SBM Bank")
- receipt_number (string, transaction reference / receipt / invoice number)
- payment_date (string, date of payment in YYYY-MM-DD format)
- description (string, payment reference / description / purpose)
- purchase_currency (string, the currency used for the purchase if different from transaction currency)
- transaction_currency (string, the currency the transaction was processed in)
- transaction_amount (float, the total amount in the transaction currency — e.g. if the base amount is 125.00 DKK and that equals 17.36 EUR, then transaction_amount is 17.36. Do NOT return an exchange rate like 0.1389.)
- card_number (string, masked card number eg "****1234" if visible)
- card_type (string, e.g. "Visa", "Mastercard", "Amex")
- payee (string, the entity/person that issued the receipt)
- address (string, address of the payee or payer if visible)
- confidence (float between 0 and 1 — how confident are you that EVERY field is correct)

Rules:
- If a field cannot be found, set it to null
- confidence should be 0.95+ if ALL fields are clearly present
- confidence should be 0.5-0.85 if some fields are ambiguous
- confidence should be <0.5 if text is garbled or most fields are missing
- Return ONLY valid JSON, no markdown, no explanation"""

FALLBACK_PROMPT = "Extract structured payment data from this text. Even if the text is messy, do your best. Return JSON with: amount, currency, payer_name, bank_issuer, receipt_number, payment_date, description, purchase_currency, transaction_currency, transaction_amount (total in transaction currency, NOT an exchange rate), card_number, card_type, payee, address. Set missing fields to null. Return ONLY JSON."


def _get_client():
    if settings.llm_provider == "nvidia":
        return OpenAI(
            api_key=settings.nvidia_api_key,
            base_url=settings.nvidia_base_url,
        )
    return OpenAI(api_key=settings.openai_api_key)


def _get_model():
    if settings.llm_provider == "nvidia":
        return settings.nvidia_model
    return settings.llm_model


def extract_with_llm(text: str):
    try:
        client = _get_client()
        model = _get_model()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Extract payment data from this text:\n\n{text[:3000]}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=500,
        )
        raw = response.choices[0].message.content
        if not raw:
            return None, raw
        return json.loads(raw), raw
    except Exception as e:
        print(f"[LLM] Extraction error: {e}")
        return None, str(e)


def llm_fallback_extract(text: str):
    try:
        client = _get_client()
        model = _get_model()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": FALLBACK_PROMPT},
                {"role": "user", "content": text[:3000]},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=500,
        )
        raw = response.choices[0].message.content
        if not raw:
            return None, raw
        return json.loads(raw), raw
    except Exception as e:
        print(f"[LLM] Fallback error: {e}")
        return None, str(e)
