import json
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from services.events import emit_server_event


@dataclass(frozen=True)
class MessageResult:
    accepted: bool
    provider: str
    provider_message_id: Optional[str]
    status: str
    error: Optional[str] = None


class MessagingProvider(ABC):
    @abstractmethod
    def send(self, *, channel: str, destination: str, content: dict[str, Any]) -> MessageResult:
        raise NotImplementedError


class EmailProvider(MessagingProvider):
    pass


class SMSProvider(MessagingProvider):
    pass


class WhatsAppProvider(MessagingProvider):
    pass


class MockMessagingProvider(EmailProvider, SMSProvider, WhatsAppProvider):
    def send(self, *, channel: str, destination: str, content: dict[str, Any]) -> MessageResult:
        if not destination:
            return MessageResult(False, "mock", None, "FAILED", "missing_destination")
        return MessageResult(True, "mock", f"mock-{uuid.uuid4()}", "SENT")


def get_messaging_provider() -> MessagingProvider:
    provider = os.getenv("MESSAGING_PROVIDER", "mock").strip().lower()
    if provider != "mock":
        raise RuntimeError("Only the mock messaging provider is available in Phase 5")
    return MockMessagingProvider()


def persist_mock_message(
    cursor,
    *,
    tenant_id: int,
    mission_id: int,
    action_id: int,
    customer_id: str,
    subject_type: str,
    subject_id: str,
    channel: str,
    destination: str,
    content: dict[str, Any],
) -> bool:
    cursor.execute(
        """INSERT INTO campaign_messages
           (tenant_id,mission_id,action_id,customer_id,subject_type,subject_id,
            channel,provider,content,status)
           VALUES (%s,%s,%s,%s,%s,%s,%s,'mock',%s::jsonb,'QUEUED')
           ON CONFLICT (mission_id,action_id,subject_type,subject_id) DO NOTHING
           RETURNING id""",
        (tenant_id, mission_id, action_id, customer_id, subject_type, subject_id, channel, json.dumps(content)),
    )
    row = cursor.fetchone()
    if not row:
        return False
    message_id = int(row[0])
    result = get_messaging_provider().send(channel=channel, destination=destination, content=content)
    cursor.execute(
        """UPDATE campaign_messages SET status = %s, provider_message_id = %s,
           failure_reason = %s, updated_at = NOW() WHERE tenant_id = %s AND id = %s""",
        (result.status, result.provider_message_id, result.error, tenant_id, message_id),
    )
    cursor.execute(
        """INSERT INTO message_deliveries
           (tenant_id,campaign_message_id,status,provider_event_id,metadata)
           VALUES (%s,%s,%s,%s,%s::jsonb)""",
        (tenant_id, message_id, result.status, result.provider_message_id, json.dumps({"mock": True})),
    )
    event_name = "message_sent" if result.accepted else "message_failed"
    emit_server_event(
        cursor, tenant_id=tenant_id, event_name=event_name,
        event_id=f"campaign-message:{message_id}:{result.status}", customer_id=customer_id,
        mission_id=str(mission_id), properties={"channel": channel, "campaignMessageId": message_id},
        consent_state="essential",
    )
    return result.accepted
