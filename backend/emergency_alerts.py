"""
Emergency Alert System for MedAssist
Handles critical patient alerts with multi-channel notifications
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel
import asyncio
import json

class AlertLevel(str, Enum):
    CRITICAL = "CRITICAL"      # Red - immediate action required
    WARNING = "WARNING"          # Yellow - urgent attention needed
    INFO = "INFO"                # Blue - monitor and observe
    NORMAL = "NORMAL"            # Green - all okay


class VitalSigns(BaseModel):
    heart_rate: int
    blood_pressure: str
    oxygen_level: int
    temperature: float
    respiratory_rate: int = 16


class EmergencyAlert(BaseModel):
    patient_id: str
    patient_name: str
    alert_level: AlertLevel
    message: str
    vitals: Optional[VitalSigns] = None
    risk_score: Optional[int] = None
    created_at: datetime = None
    resolved: bool = False

    def __init__(self, **data):
        super().__init__(**data)
        if self.created_at is None:
            self.created_at = datetime.now()

    def get_severity_color(self) -> str:
        """Get color code for alert level"""
        colors = {
            AlertLevel.CRITICAL: "#ef4444",  # Red
            AlertLevel.WARNING: "#f59e0b",   # Orange
            AlertLevel.INFO: "#3b82f6",      # Blue
            AlertLevel.NORMAL: "#10b981"     # Green
        }
        return colors.get(self.alert_level, "#6b7280")

    def get_urgency_text(self) -> str:
        """Get human-readable urgency message"""
        urgencies = {
            AlertLevel.CRITICAL: "🚨 CRITICAL - Immediate Medical Evaluation Required",
            AlertLevel.WARNING: "⚠️ WARNING - Urgent Physician Attention Needed",
            AlertLevel.INFO: "ℹ️ INFO - Monitor Patient Closely",
            AlertLevel.NORMAL: "✅ NORMAL - Continue Routine Care"
        }
        return urgencies.get(self.alert_level, "Status Unknown")


# In-memory alert storage (in production, use database)
ACTIVE_ALERTS: dict = {}
ALERT_HISTORY: list = []


async def create_alert(alert: EmergencyAlert) -> dict:
    """
    Create an emergency alert and trigger notifications
    """
    alert_id = f"{alert.patient_id}_{int(alert.created_at.timestamp())}"
    
    ACTIVE_ALERTS[alert_id] = alert
    ALERT_HISTORY.append(alert)
    
    # Log critical alerts
    if alert.alert_level == AlertLevel.CRITICAL:
        print(f"\n{'='*60}")
        print(f"🚨 CRITICAL ALERT TRIGGERED")
        print(f"{'='*60}")
        print(f"Patient: {alert.patient_name} ({alert.patient_id})")
        print(f"Message: {alert.message}")
        if alert.risk_score:
            print(f"Risk Score: {alert.risk_score}/100")
        print(f"Time: {alert.created_at}")
        print(f"{'='*60}\n")
    
    # Trigger notifications (would integrate with email/SMS in production)
    await notify_doctor(alert)
    await notify_family(alert)
    
    return {
        "alert_id": alert_id,
        "status": "alert_created",
        "urgency": alert.get_urgency_text(),
        "severity_color": alert.get_severity_color(),
        "timestamp": alert.created_at.isoformat()
    }


async def notify_doctor(alert: EmergencyAlert) -> bool:
    """Send notification to doctor (email/SMS in production)"""
    print(f"📧 Notifying doctor about {alert.patient_name}'s {alert.alert_level} alert...")
    # In production: send_email(doctor_email, alert_message)
    # In production: send_sms(doctor_phone, alert_message)
    await asyncio.sleep(0.1)  # Simulate async notification
    return True


async def notify_family(alert: EmergencyAlert) -> bool:
    """Send notification to family members"""
    if alert.alert_level in [AlertLevel.CRITICAL, AlertLevel.WARNING]:
        print(f"📱 Notifying family members about {alert.patient_name}'s alert...")
        # In production: send_sms(family_phone, alert_message)
        await asyncio.sleep(0.1)  # Simulate async notification
    return True


def get_patient_alerts(patient_id: str) -> dict:
    """Get all alerts for a specific patient"""
    patient_alerts = [
        alert for alert in ALERT_HISTORY 
        if alert.patient_id == patient_id
    ]
    
    critical = [a for a in patient_alerts if a.alert_level == AlertLevel.CRITICAL]
    warning = [a for a in patient_alerts if a.alert_level == AlertLevel.WARNING]
    info = [a for a in patient_alerts if a.alert_level == AlertLevel.INFO]
    
    return {
        "patient_id": patient_id,
        "critical_alerts": [a.dict() for a in critical],
        "warning_alerts": [a.dict() for a in warning],
        "info_alerts": [a.dict() for a in info],
        "total_alerts": len(patient_alerts),
        "active_critical": len([a for a in critical if not a.resolved])
    }


def resolve_alert(alert_id: str) -> bool:
    """Mark alert as resolved"""
    if alert_id in ACTIVE_ALERTS:
        ACTIVE_ALERTS[alert_id].resolved = True
        del ACTIVE_ALERTS[alert_id]
        return True
    return False


def get_active_alerts() -> list:
    """Get all currently active alerts"""
    return [
        {
            "alert_id": alert_id,
            "patient_id": alert.patient_id,
            "patient_name": alert.patient_name,
            "alert_level": alert.alert_level,
            "message": alert.message,
            "risk_score": alert.risk_score,
            "created_at": alert.created_at.isoformat(),
            "urgency_text": alert.get_urgency_text(),
            "severity_color": alert.get_severity_color()
        }
        for alert_id, alert in ACTIVE_ALERTS.items()
    ]
