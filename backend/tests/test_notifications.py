from app.db.responders import normalize_india_whatsapp
from app.services import notification_service


def test_normalize_india_whatsapp_accepts_common_formats():
    assert normalize_india_whatsapp("6304589007")["whatsapp"] == "whatsapp:+916304589007"
    assert normalize_india_whatsapp("+916304589007")["whatsapp"] == "whatsapp:+916304589007"
    assert normalize_india_whatsapp("91 63045 89007")["whatsapp"] == "whatsapp:+916304589007"
    assert normalize_india_whatsapp("whatsapp:+916304589007")["whatsapp"] == "whatsapp:+916304589007"


def test_send_whatsapp_rejects_invalid_recipient():
    result = notification_service._send_whatsapp(
        to="6304589007",
        message="Test dispatch",
        responder={"id": "resp-test", "name": "Test Responder", "phone": "6304589007"},
    )

    assert result["status"] == "failed"
    assert "Invalid WhatsApp recipient" in result["error"]
