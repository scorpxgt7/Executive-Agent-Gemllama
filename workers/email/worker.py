from typing import Dict, Any, List
import structlog
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from datetime import datetime

logger = structlog.get_logger()

class EmailWorker:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.username = os.getenv("SMTP_USERNAME")
        self.password = os.getenv("SMTP_PASSWORD")

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute email task"""
        action = task_data.get("action", "send")

        try:
            if action == "send":
                return await self._send_email(task_data)
            elif action == "bulk_send":
                return await self._bulk_send(task_data)
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}
        except Exception as e:
            logger.error("Email task failed", error=str(e), task=task_data)
            return {"status": "failed", "error": str(e)}

    async def _send_email(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send a single email"""
        to_email = task_data.get("to", "")
        subject = task_data.get("subject", "")
        body = task_data.get("body", "")
        body_type = task_data.get("body_type", "text")  # text or html
        attachments = task_data.get("attachments", [])
        cc = task_data.get("cc", [])
        bcc = task_data.get("bcc", [])

        if not all([to_email, subject, body]):
            return {"status": "error", "message": "Missing required fields: to, subject, body"}

        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.username
            msg['To'] = to_email
            msg['Subject'] = subject

            if cc:
                msg['Cc'] = ', '.join(cc)
            if bcc:
                msg['Bcc'] = ', '.join(bcc)

            # Add body
            if body_type == "html":
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))

            # Add attachments
            for attachment in attachments:
                await self._add_attachment(msg, attachment)

            if not self.username or not self.password:
                logger.info("Email logged (no SMTP credentials configured)", to=to_email, subject=subject)
                return {
                    "status": "success",
                    "action": "send_email",
                    "to": to_email,
                    "subject": subject,
                    "attachments": len(attachments),
                    "timestamp": datetime.utcnow().isoformat()
                }

            # Send email via SMTP
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.username, self.password)

            recipients = [to_email]
            if cc:
                recipients.extend(cc)
            if bcc:
                recipients.extend(bcc)

            text = msg.as_string()
            server.sendmail(self.username, recipients, text)
            server.quit()

            return {
                "status": "success",
                "action": "send_email",
                "to": to_email,
                "subject": subject,
                "attachments": len(attachments),
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _bulk_send(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send emails to multiple recipients"""
        emails = task_data.get("emails", [])
        template = task_data.get("template", {})

        if not emails:
            return {"status": "error", "message": "No emails provided"}

        results = []
        for email_data in emails:
            # Merge template with specific email data
            merged_data = {**template, **email_data}
            result = await self._send_email(merged_data)
            results.append({
                "recipient": email_data.get("to", ""),
                "result": result
            })

        success_count = sum(1 for r in results if r["result"]["status"] == "success")
        failure_count = len(results) - success_count

        return {
            "status": "completed",
            "action": "bulk_send",
            "total_emails": len(emails),
            "successful": success_count,
            "failed": failure_count,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _add_attachment(self, msg: MIMEMultipart, attachment: Dict[str, Any]):
        """Add an attachment to the email"""
        file_path = attachment.get("path", "")
        filename = attachment.get("filename", os.path.basename(file_path))

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Attachment file not found: {file_path}")

        with open(file_path, "rb") as f:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename={filename}')
            msg.attach(part)

    async def send_notification(self, to_email: str, subject: str, message: str) -> Dict[str, Any]:
        """Send a simple notification email"""
        task_data = {
            "to": to_email,
            "subject": subject,
            "body": message,
            "body_type": "text"
        }
        return await self._send_email(task_data)

    async def send_approval_request(self, approver_email: str, plan_details: Dict[str, Any],
                                   approval_url: str) -> Dict[str, Any]:
        """Send an approval request email"""
        subject = f"Approval Required: {plan_details.get('goal_description', 'Plan')}"

        body = f"""
        An automated plan requires your approval before execution.

        Goal: {plan_details.get('goal_description', 'N/A')}
        Plan ID: {plan_details.get('plan_id', 'N/A')}
        Risk Level: {plan_details.get('risk_level', 'N/A')}

        Tasks to be executed:
        {chr(10).join(f"- {task}" for task in plan_details.get('tasks', []))}

        Approve or reject: {approval_url}

        This is an automated message from the Executive Agent Platform.
        """

        task_data = {
            "to": approver_email,
            "subject": subject,
            "body": body,
            "body_type": "text"
        }
        return await self._send_email(task_data)
