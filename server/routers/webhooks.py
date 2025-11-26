"""
Webhook configuration API endpoints.

Provides REST API for managing webhook configurations (Slack, Discord)
for alert notifications. Configuration is persisted to data/config/webhooks.json
"""
from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from server.webhook_config import (
    load_webhooks,
    save_webhooks,
    WebhookConfig,
    get_webhooks,
)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


class WebhookSaveRequest(BaseModel):
    """Request model for saving webhook configuration."""

    slack_url: str | None = Field(None, description="Slack webhook URL")
    discord_url: str | None = Field(None, description="Discord webhook URL")
    enabled: bool | None = Field(None, description="Enable webhook notifications")
    severity: Dict[str, bool] | None = Field(
        None, description="Severity levels to notify: critical, warning, info"
    )
    include_resolved: bool | None = Field(
        None, description="Include resolved alerts in notifications"
    )


class WebhookSaveResponse(BaseModel):
    """Response model for save operations."""

    status: str = Field(..., description="Operation status")
    message: str = Field(..., description="Human-readable message")


class WebhookConfigResponse(BaseModel):
    """Response model for webhook configuration."""

    slack_webhook_url: str
    discord_webhook_url: str
    alert_notify_enabled: bool
    alert_notify_severities: str
    alert_include_resolved: bool
    alert_webhook_timeout_seconds: float


@router.post("/save", response_model=WebhookSaveResponse)
async def save_webhook_config(request: WebhookSaveRequest) -> WebhookSaveResponse:
    """
    Save webhook configuration to disk.

    Accepts partial updates - only specified fields will be updated,
    preserving existing values for unspecified fields.

    Args:
        request: Webhook configuration to save

    Returns:
        Success/failure status with message

    Raises:
        HTTPException: If save operation fails
    """
    try:
        # Load existing config
        config = load_webhooks()

        # Update fields that were provided
        if request.slack_url is not None:
            config.slack_webhook_url = request.slack_url

        if request.discord_url is not None:
            config.discord_webhook_url = request.discord_url

        if request.enabled is not None:
            config.alert_notify_enabled = request.enabled

        if request.include_resolved is not None:
            config.alert_include_resolved = request.include_resolved

        if request.severity is not None:
            # Convert severity dict to comma-separated string
            severities = []
            if request.severity.get("critical", False):
                severities.append("critical")
            if request.severity.get("warning", False):
                severities.append("warning")
            if request.severity.get("info", False):
                severities.append("info")
            config.alert_notify_severities = ",".join(severities)

        # Save to disk
        save_webhooks(config)

        return WebhookSaveResponse(
            status="success",
            message="Webhook configuration saved successfully"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save webhook configuration: {str(e)}"
        )


@router.get("/config", response_model=WebhookConfigResponse)
async def get_webhook_config() -> WebhookConfigResponse:
    """
    Get current webhook configuration.

    Returns:
        Current webhook configuration

    Raises:
        HTTPException: If load operation fails
    """
    try:
        config_dict = get_webhooks()
        return WebhookConfigResponse(**config_dict)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load webhook configuration: {str(e)}"
        )
