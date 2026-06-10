"""DB-backed structured purchase flow for customer chats."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models.tables import Conversation, Handoff, PurchaseOrder
from backend.services.ai import embeddings, vectorstore
from backend.services.intent_classifier import IntentResult


ACTIVE_STATES = {
    "collecting_product",
    "collecting_quantity",
    "collecting_address",
    "awaiting_confirmation",
}
ACTIVE_STATUSES = {"pending", "confirmed"}


@dataclass
class PurchaseFlowResult:
    reply: str
    confidence: float = 1.0
    escalated: bool = False
    reason: str | None = None
    order: PurchaseOrder | None = None


def get_active_purchase_order(db: Session, conv: Conversation) -> PurchaseOrder | None:
    stmt = (
        select(PurchaseOrder)
        .where(
            PurchaseOrder.conversation_id == conv.id,
            PurchaseOrder.status.in_(list(ACTIVE_STATUSES)),
            PurchaseOrder.state.in_(list(ACTIVE_STATES)),
        )
        .order_by(PurchaseOrder.id.desc())
    )
    return db.scalars(stmt).first()


def advance_purchase_flow(
    db: Session,
    conv: Conversation,
    message: str,
    setting,
    intent_result: IntentResult | None = None,
) -> PurchaseFlowResult:
    order = get_active_purchase_order(db, conv)
    if order is None:
        order = PurchaseOrder(
            conversation_id=conv.id,
            customer_ref=conv.customer_ref,
            status="pending",
            state="collecting_product",
            order_data={},
        )
        db.add(order)
        db.flush()

    if _is_expired(order, setting):
        order.status = "cancelled"
        order.state = "cancelled"
        order.updated_at = datetime.utcnow()
        result = PurchaseFlowResult(
            reply="انتهت جلسة الطلب السابقة. يسعدني مساعدتك من جديد، ما المنتج الذي تود طلبه؟",
            order=order,
        )
        db.flush()
        return result

    if _is_cancel(message):
        order.status = "cancelled"
        order.state = "cancelled"
        order.updated_at = datetime.utcnow()
        result = PurchaseFlowResult(reply="تم إلغاء الطلب. هل تحتاج مساعدة في شيء آخر؟", order=order)
        db.flush()
        return result

    state = order.state or "collecting_product"
    if state == "collecting_product":
        result = _collect_product(db, order, message, setting, intent_result)
    elif state == "collecting_quantity":
        result = _collect_quantity(order, message, setting)
    elif state == "collecting_address":
        result = _collect_address(db, conv, order, message, setting)
    elif state == "awaiting_confirmation":
        result = _collect_confirmation(db, conv, order, message, setting)
    else:
        order.state = "collecting_product"
        order.updated_at = datetime.utcnow()
        result = PurchaseFlowResult(reply="تسعدني مساعدتك في الشراء! أي منتج تود طلبه؟", order=order)

    db.flush()
    return result


def _collect_product(
    db: Session,
    order: PurchaseOrder,
    message: str,
    setting,
    intent_result: IntentResult | None,
) -> PurchaseFlowResult:
    product_hint = (intent_result.product_mentioned if intent_result else None) or _product_hint(message)
    if not product_hint:
        return PurchaseFlowResult(reply="تسعدني مساعدتك في الشراء! أي منتج تود طلبه؟", order=order)

    match = _match_product(product_hint)
    product_name = match.get("product_name") or product_hint
    order.product_name = product_name
    order.order_data = {**(order.order_data or {}), **match, "product_hint": product_hint}
    order.updated_at = datetime.utcnow()

    if getattr(setting, "purchase_collect_quantity", True):
        order.state = "collecting_quantity"
        return PurchaseFlowResult(reply=f"ممتاز! كم قطعة تريد من {product_name}؟", order=order)

    order.quantity = 1
    if getattr(setting, "purchase_collect_address", True):
        order.state = "collecting_address"
        return PurchaseFlowResult(reply="رائع! أرسل لي عنوان التوصيل من فضلك.", order=order)

    order.state = "awaiting_confirmation"
    return PurchaseFlowResult(reply=_build_order_summary(order, setting), order=order)


def _collect_quantity(order: PurchaseOrder, message: str, setting) -> PurchaseFlowResult:
    qty = _parse_quantity(message)
    if qty is None or qty <= 0:
        return PurchaseFlowResult(reply="لم أتمكن من تحديد الكمية. كم قطعة تريد؟", order=order)

    order.quantity = qty
    order.updated_at = datetime.utcnow()
    if getattr(setting, "purchase_collect_address", True):
        order.state = "collecting_address"
        return PurchaseFlowResult(reply="رائع! أرسل لي عنوان التوصيل من فضلك.", order=order)

    order.state = "awaiting_confirmation"
    return PurchaseFlowResult(reply=_build_order_summary(order, setting), order=order)


def _collect_address(
    db: Session,
    conv: Conversation,
    order: PurchaseOrder,
    message: str,
    setting,
) -> PurchaseFlowResult:
    address = message.strip()
    if len(address) < 6:
        return PurchaseFlowResult(reply="أرسل لي عنواناً أوضح للتوصيل من فضلك.", order=order)

    order.delivery_address = address
    order.updated_at = datetime.utcnow()

    if getattr(setting, "purchase_confirmation_required", True):
        order.state = "awaiting_confirmation"
        return PurchaseFlowResult(reply=_build_order_summary(order, setting), order=order)

    return _finalize_order(db, conv, order, setting)


def _collect_confirmation(
    db: Session,
    conv: Conversation,
    order: PurchaseOrder,
    message: str,
    setting,
) -> PurchaseFlowResult:
    if _is_yes(message):
        return _finalize_order(db, conv, order, setting)
    if _is_no(message):
        order.status = "cancelled"
        order.state = "cancelled"
        order.updated_at = datetime.utcnow()
        return PurchaseFlowResult(reply="تم إلغاء الطلب. هل تحتاج مساعدة في شيء آخر؟", order=order)
    return PurchaseFlowResult(reply="هل تؤكد الطلب؟ أرسل نعم للتأكيد أو لا للإلغاء.", order=order)


def _finalize_order(
    db: Session | None,
    conv: Conversation | None,
    order: PurchaseOrder,
    setting,
) -> PurchaseFlowResult:
    order.status = "forwarded" if getattr(setting, "purchase_auto_forward_to_support", True) else "confirmed"
    order.state = "forwarded_to_support" if order.status == "forwarded" else "confirmed"
    order.updated_at = datetime.utcnow()
    if db is not None and conv is not None and getattr(setting, "purchase_auto_forward_to_support", True):
        conv.status = "handoff"
        _ensure_purchase_handoff(db, conv)
    return PurchaseFlowResult(
        reply="تم تسجيل طلبك! سيتواصل معك فريقنا خلال دقائق لإتمام الطلب.",
        escalated=order.status == "forwarded",
        reason="purchase_complete" if order.status == "forwarded" else None,
        order=order,
    )


def _ensure_purchase_handoff(db: Session, conv: Conversation) -> None:
    existing = db.scalars(
        select(Handoff).where(Handoff.conversation_id == conv.id, Handoff.status == "pending")
    ).first()
    if existing is None:
        db.add(Handoff(conversation_id=conv.id, reason="purchase_complete", status="pending"))
    else:
        existing.reason = "purchase_complete"


def _build_order_summary(order: PurchaseOrder, setting) -> str:
    qty = order.quantity or 1
    lines = [
        "ملخص طلبك:",
        f"المنتج: {order.product_name or '-'} x {qty}",
    ]
    if order.delivery_address:
        lines.append(f"العنوان: {order.delivery_address}")
    price_text = (order.order_data or {}).get("price_text")
    if price_text:
        lines.append(f"السعر: {price_text}")
    lines.append("")
    lines.append("هل تؤكد الطلب؟ (نعم / لا)")
    return "\n".join(lines)


def _match_product(product_hint: str) -> dict[str, Any]:
    if not product_hint:
        return {}
    data: dict[str, Any] = {"product_name": product_hint}
    try:
        if vectorstore.is_empty():
            return data
        hits = vectorstore.query(embeddings.embed_query(product_hint), k=3)
    except Exception:
        return data

    if not hits:
        return data

    top = hits[0]
    data.update(
        {
            "product_name": product_hint,
            "matched_chunk": top.text,
            "match_confidence": round(top.confidence, 4),
            "match_metadata": top.metadata,
        }
    )
    price = _extract_price(top.text)
    if price:
        data["price_text"] = price
    return data


def _extract_price(text: str) -> str | None:
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*(SAR|USD|ILS|ريال|دولار|شيكل)", text, re.I)
    return match.group(0) if match else None


def _parse_quantity(message: str) -> int | None:
    digit = re.search(r"\d+", message)
    if digit:
        return int(digit.group(0))
    words = {
        "واحد": 1,
        "واحدة": 1,
        "one": 1,
        "اثنين": 2,
        "اثنان": 2,
        "two": 2,
        "ثلاثة": 3,
        "ثلاث": 3,
        "three": 3,
        "اربعة": 4,
        "أربعة": 4,
        "four": 4,
        "خمسة": 5,
        "five": 5,
    }
    normalized = message.strip().lower()
    for word, value in words.items():
        if word.lower() in normalized:
            return value
    return None


def _product_hint(message: str) -> str | None:
    cleaned = re.sub(
        r"(أريد|اريد|أبغى|ابغى|أبي|ابي|عايز|عاوز|شراء|اشتري|أشتري|طلب|اطلب|أطلب|i want to buy|i want to order|buy|order|purchase)",
        "",
        message,
        flags=re.IGNORECASE,
    ).strip(" ؟?.,،")
    return cleaned or None


def _is_expired(order: PurchaseOrder, setting) -> bool:
    minutes = getattr(setting, "purchase_session_minutes", 30) or 30
    updated_at = order.updated_at or order.created_at or datetime.utcnow()
    return datetime.utcnow() - updated_at > timedelta(minutes=minutes)


def _is_yes(message: str) -> bool:
    return message.strip().lower() in {"yes", "y", "ok", "okay", "confirm", "نعم", "اي", "إي", "تمام", "موافق", "أكد", "اكد"}


def _is_no(message: str) -> bool:
    return message.strip().lower() in {"no", "n", "cancel", "لا", "الغاء", "إلغاء", "ألغي", "الغي"}


def _is_cancel(message: str) -> bool:
    return message.strip().lower() in {"cancel", "stop", "لا اريد", "لا أريد", "الغاء", "إلغاء", "الغي الطلب", "ألغي الطلب"}
