"""Email service for sending transactional emails."""
import logging
import os
import re
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

# Import email libraries based on availability
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

from app.core.config import settings


class EmailService:
    """Email service for sending transactional emails."""

    def __init__(self):
        """Initialize email service with configured provider."""
        self.provider = os.getenv("EMAIL_PROVIDER", "console")  # console, resend, sendgrid, smtp
        self.from_email = os.getenv("EMAIL_FROM", "noreply@glambylynn.com")
        self.from_name = os.getenv("EMAIL_FROM_NAME", "Glam by Lynn")

        if self.provider == "resend":
            if not RESEND_AVAILABLE:
                raise ImportError("Resend package not installed. Run: pip install resend")
            resend.api_key = os.getenv("RESEND_API_KEY")
        elif self.provider == "sendgrid":
            if not SENDGRID_AVAILABLE:
                raise ImportError("SendGrid package not installed. Run: pip install sendgrid")
            self.sendgrid_key = os.getenv("SENDGRID_API_KEY")

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Send an email using configured provider.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content (optional)

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            if self.provider == "console":
                # Development mode - print to console
                print("\n" + "=" * 80)
                print(f"EMAIL: {subject}")
                print(f"TO: {to_email}")
                print(f"FROM: {self.from_name} <{self.from_email}>")
                print("-" * 80)
                print(text_content or html_content)
                print("=" * 80 + "\n")
                return True

            elif self.provider == "resend":
                response = resend.Emails.send({
                    "from": f"{self.from_name} <{self.from_email}>",
                    "to": to_email,
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                })
                # Resend returns {"id": "..."} on success; surface it so a
                # send can be traced in the provider dashboard.
                message_id = response.get("id") if isinstance(response, dict) else None
                logger.info(
                    "Email sent via resend to %s (subject=%r, id=%s)",
                    to_email, subject, message_id,
                )
                return True

            elif self.provider == "sendgrid":
                message = Mail(
                    from_email=(self.from_email, self.from_name),
                    to_emails=to_email,
                    subject=subject,
                    html_content=html_content,
                    plain_text_content=text_content,
                )
                sg = SendGridAPIClient(self.sendgrid_key)
                sg.send(message)
                logger.info(
                    "Email sent via sendgrid to %s (subject=%r)", to_email, subject
                )
                return True

            else:
                logger.error(
                    "Unknown email provider %r — cannot send to %s (subject=%r)",
                    self.provider, to_email, subject,
                )
                return False

        except Exception as e:
            # Log the recipient and the provider error with a traceback. This is
            # the only place a per-recipient failure (e.g. Resend rejecting a
            # non-verified-domain recipient) becomes visible — without it the
            # caller just sees False and the failure is silent.
            logger.exception(
                "Failed to send email via %s to %s (subject=%r): %s",
                self.provider, to_email, subject, e,
            )
            return False

    def send_order_confirmation(
        self,
        to_email: str,
        order_number: str,
        customer_name: str,
        order_items: list,
        subtotal: Decimal,
        discount: Decimal,
        delivery_fee: Decimal,
        total: Decimal,
        delivery_address: Dict[str, Any],
    ) -> bool:
        """
        Send order confirmation email.

        Args:
            to_email: Customer email
            order_number: Order number
            customer_name: Customer name
            order_items: List of order items with product details
            subtotal: Order subtotal
            discount: Discount amount
            delivery_fee: Delivery fee
            total: Total amount
            delivery_address: Delivery address details

        Returns:
            True if sent successfully
        """
        subject = f"Order Confirmation - {order_number}"

        # Build items HTML
        items_html = ""
        for item in order_items:
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    {item.get('product_title', 'Product')}
                    {f"({item.get('variant_name', '')})" if item.get('variant_name') else ''}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                    {item.get('quantity', 1)}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    KES {item.get('unit_price', 0):,.2f}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    KES {item.get('total_price', 0):,.2f}
                </td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">Glam by Lynn</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your order!</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #ec4899; margin-top: 0;">Order Confirmed</h2>

                <p>Hi {customer_name},</p>

                <p>We've received your order and will process it shortly. Here are your order details:</p>

                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Order Number:</strong> {order_number}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Order Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                </div>

                <h3 style="color: #333; margin-top: 30px;">Order Items</h3>
                <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 10px; text-align: left;">Product</th>
                            <th style="padding: 10px; text-align: center;">Qty</th>
                            <th style="padding: 10px; text-align: right;">Price</th>
                            <th style="padding: 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>

                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span>Subtotal:</span>
                        <span>KES {subtotal:,.2f}</span>
                    </div>
                    {f'<div style="display: flex; justify-content: space-between; padding: 5px 0; color: #10b981;"><span>Discount:</span><span>-KES {discount:,.2f}</span></div>' if discount > 0 else ''}
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span>Delivery Fee:</span>
                        <span>KES {delivery_fee:,.2f}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 15px 0 5px 0; border-top: 2px solid #ec4899; margin-top: 10px; font-size: 18px; font-weight: bold;">
                        <span>Total:</span>
                        <span style="color: #ec4899;">KES {total:,.2f}</span>
                    </div>
                </div>

                <h3 style="color: #333; margin-top: 30px;">Delivery Address</h3>
                <div style="background: white; padding: 20px; border-radius: 8px;">
                    <p style="margin: 0;">{delivery_address.get('full_name', '')}</p>
                    <p style="margin: 5px 0 0 0;">{delivery_address.get('phone', '')}</p>
                    <p style="margin: 5px 0 0 0;">{delivery_address.get('address', '')}</p>
                    <p style="margin: 5px 0 0 0;">{delivery_address.get('city', '')}, {delivery_address.get('county', '')}</p>
                </div>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>What's Next?</strong><br>
                        We'll send you another email once your order ships with tracking information.
                    </p>
                </div>

                <p style="margin-top: 30px;">
                    If you have any questions about your order, please contact us at support@glambylynn.com
                </p>

                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    Best regards,<br>
                    <strong style="color: #ec4899;">The Glam by Lynn Team</strong>
                </p>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px;">
                <p>© {datetime.now().year} Glam by Lynn. All rights reserved.</p>
                <p>Kitui & Nairobi, Kenya</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        GLAM BY LYNN - ORDER CONFIRMATION

        Hi {customer_name},

        Thank you for your order! We've received your order and will process it shortly.

        Order Number: {order_number}
        Order Date: {datetime.now().strftime('%B %d, %Y')}

        ORDER ITEMS:
        {chr(10).join([f"- {item.get('product_title', 'Product')} x{item.get('quantity', 1)} - KES {item.get('total_price', 0):,.2f}" for item in order_items])}

        SUMMARY:
        Subtotal: KES {subtotal:,.2f}
        {'Discount: -KES ' + f'{discount:,.2f}' if discount > 0 else ''}
        Delivery Fee: KES {delivery_fee:,.2f}
        Total: KES {total:,.2f}

        DELIVERY ADDRESS:
        {delivery_address.get('full_name', '')}
        {delivery_address.get('phone', '')}
        {delivery_address.get('address', '')}
        {delivery_address.get('city', '')}, {delivery_address.get('county', '')}

        What's Next?
        We'll send you another email once your order ships with tracking information.

        If you have any questions, contact us at support@glambylynn.com

        Best regards,
        The Glam by Lynn Team

        © {datetime.now().year} Glam by Lynn. All rights reserved.
        Kitui & Nairobi, Kenya
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_booking_received_customer(
        self,
        to_email: str,
        booking_number: str,
        customer_name: str,
        service_name: str,
        booking_date: datetime,
        location: str,
        subtotal: Decimal,
        deposit: Decimal,
        whatsapp_url: Optional[str] = None,
        call_number: Optional[str] = None,
    ) -> bool:
        """
        Notify the customer that we've received their booking request.

        The booking is not yet confirmed — our team reviews it, verifies
        availability and location, and gets back in touch with the transport
        quote and payment instructions. The email gives the customer a clear
        way to follow up (WhatsApp / call) instead of waiting passively.

        Args:
            to_email: Customer email
            booking_number: Booking reference number
            customer_name: Customer name
            service_name: Service/package name
            booking_date: Requested booking date
            location: Service location text
            subtotal: Service subtotal (transport confirmed later)
            deposit: Estimated 50% deposit
            whatsapp_url: Pre-filled wa.me follow-up link (optional)
            call_number: Business phone for the call button, digits only (optional)

        Returns:
            True if sent successfully
        """
        subject = f"We've received your booking - {booking_number}"

        # Build the follow-up CTA buttons only when we have contact channels.
        cta_buttons = ""
        if whatsapp_url:
            cta_buttons += (
                f'<a href="{whatsapp_url}" '
                'style="display: inline-block; background: #22c55e; color: #ffffff; '
                'padding: 14px 28px; border-radius: 8px; text-decoration: none; '
                'font-weight: bold; margin: 6px;">Follow up on WhatsApp</a>'
            )
        if call_number:
            cta_buttons += (
                f'<a href="tel:+{call_number}" '
                'style="display: inline-block; background: #111827; color: #ffffff; '
                'padding: 14px 28px; border-radius: 8px; text-decoration: none; '
                'font-weight: bold; margin: 6px;">Call us</a>'
            )
        cta_html = (
            f'<div style="text-align: center; margin: 24px 0;">{cta_buttons}</div>'
            if cta_buttons
            else ""
        )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">Glam by Lynn</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">We've received your booking!</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #ec4899; margin-top: 0;">Thank you, {customer_name}!</h2>

                <p>Your booking request has been received. Here's a summary of what you requested:</p>

                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Booking Number:</strong> {booking_number}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Service:</strong> {service_name}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Date:</strong> {booking_date.strftime('%B %d, %Y')}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Time:</strong> To be confirmed</p>
                    <p style="margin: 10px 0 0 0;"><strong>Location:</strong> {location}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Service subtotal:</strong> KES {subtotal:,.2f}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Transport:</strong> To be confirmed</p>
                    <p style="margin: 10px 0 0 0;"><strong>Estimated deposit (50%):</strong> KES {deposit:,.2f}</p>
                </div>

                <div style="background: #fdf2f8; border-left: 4px solid #ec4899; padding: 15px; margin-top: 20px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>What happens next?</strong><br>
                        Our team will review your booking and contact you by call or WhatsApp to
                        confirm availability and your location. We'll then share the final cost
                        (including transport) and instructions for paying your deposit.
                    </p>
                </div>

                {cta_html}

                <p style="text-align: center; color: #666; font-size: 14px; margin-top: 0;">
                    Have a question or want to follow up? Reach us using the buttons above and
                    quote your booking number <strong>{booking_number}</strong>.
                </p>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    Warm regards,<br>
                    <strong style="color: #ec4899;">The Glam by Lynn Team</strong>
                </p>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px;">
                <p>© {datetime.now().year} Glam by Lynn. All rights reserved.</p>
                <p>Kitui & Nairobi, Kenya</p>
            </div>
        </body>
        </html>
        """

        contact_text = ""
        if whatsapp_url:
            contact_text += f"\n        Follow up on WhatsApp: {whatsapp_url}"
        if call_number:
            contact_text += f"\n        Call us: +{call_number}"

        text_content = f"""
        GLAM BY LYNN - BOOKING RECEIVED

        Hi {customer_name},

        Your booking request has been received. Here's what you requested:

        Booking Number: {booking_number}
        Service: {service_name}
        Date: {booking_date.strftime('%B %d, %Y')}
        Time: To be confirmed
        Location: {location}
        Service subtotal: KES {subtotal:,.2f}
        Transport: To be confirmed
        Estimated deposit (50%): KES {deposit:,.2f}

        WHAT HAPPENS NEXT?
        Our team will review your booking and contact you by call or WhatsApp to confirm
        availability and your location. We'll then share the final cost (including transport)
        and instructions for paying your deposit.

        Want to follow up? Quote your booking number {booking_number}.{contact_text}

        Warm regards,
        The Glam by Lynn Team

        © {datetime.now().year} Glam by Lynn. All rights reserved.
        Kitui & Nairobi, Kenya
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_booking_admin_notification(
        self,
        to_email: str,
        booking_number: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        service_name: str,
        booking_date: datetime,
        location: str,
        location_description: Optional[str],
        attendees: str,
        subtotal: Decimal,
        special_requests: Optional[str],
        admin_url: str,
        customer_whatsapp_url: Optional[str] = None,
    ) -> bool:
        """
        Notify the admin/team that a new booking needs review.

        Args:
            to_email: Admin recipient
            booking_number: Booking reference number
            customer_name / customer_email / customer_phone: Customer contact
            service_name: Service/package name
            booking_date: Requested date
            location: Location text
            location_description: Extra location details from the customer
            attendees: Pre-formatted attendee summary
            subtotal: Service subtotal (transport set manually later)
            special_requests: Customer notes
            admin_url: Link to the booking in the admin dashboard
            customer_whatsapp_url: Pre-filled wa.me link to message the customer

        Returns:
            True if sent successfully
        """
        subject = f"New booking to review - {booking_number} ({customer_name})"

        phone_digits = re.sub(r"\D", "", customer_phone or "")
        contact_buttons = (
            f'<a href="tel:{customer_phone}" '
            'style="display: inline-block; background: #111827; color: #ffffff; '
            'padding: 12px 22px; border-radius: 8px; text-decoration: none; '
            'font-weight: bold; margin: 6px;">Call customer</a>'
            if phone_digits
            else ""
        )
        if customer_whatsapp_url:
            contact_buttons += (
                f'<a href="{customer_whatsapp_url}" '
                'style="display: inline-block; background: #22c55e; color: #ffffff; '
                'padding: 12px 22px; border-radius: 8px; text-decoration: none; '
                'font-weight: bold; margin: 6px;">WhatsApp customer</a>'
            )
        contact_buttons += (
            f'<a href="{admin_url}" '
            'style="display: inline-block; background: #ec4899; color: #ffffff; '
            'padding: 12px 22px; border-radius: 8px; text-decoration: none; '
            'font-weight: bold; margin: 6px;">Open in dashboard</a>'
        )

        description_row = (
            f'<p style="margin: 10px 0 0 0;"><strong>Location details:</strong> {location_description}</p>'
            if location_description
            else ""
        )
        requests_row = (
            f'<p style="margin: 10px 0 0 0;"><strong>Special requests:</strong> {special_requests}</p>'
            if special_requests
            else ""
        )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">Glam by Lynn</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">New booking to review</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #ec4899; margin-top: 0;">Booking {booking_number}</h2>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>Action needed:</strong> Review the details below, then contact the
                        customer to verify availability and location, confirm the transport cost,
                        and share payment instructions to proceed.
                    </p>
                </div>

                <h3 style="color: #333; margin-top: 24px;">Customer</h3>
                <div style="background: white; padding: 20px; border-radius: 8px;">
                    <p style="margin: 0;"><strong>Name:</strong> {customer_name}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Email:</strong> {customer_email}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Phone:</strong> {customer_phone}</p>
                </div>

                <h3 style="color: #333; margin-top: 24px;">Booking</h3>
                <div style="background: white; padding: 20px; border-radius: 8px;">
                    <p style="margin: 0;"><strong>Service:</strong> {service_name}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Date:</strong> {booking_date.strftime('%B %d, %Y')}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Time:</strong> To be confirmed with customer</p>
                    <p style="margin: 10px 0 0 0;"><strong>Location:</strong> {location}</p>
                    {description_row}
                    <p style="margin: 10px 0 0 0;"><strong>Attendees:</strong> {attendees}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Service subtotal:</strong> KES {subtotal:,.2f}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Transport:</strong> To be set after location verification</p>
                    {requests_row}
                </div>

                <div style="text-align: center; margin: 24px 0;">
                    {contact_buttons}
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px;">
                <p>© {datetime.now().year} Glam by Lynn. Internal notification.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        GLAM BY LYNN - NEW BOOKING TO REVIEW

        Booking Number: {booking_number}

        ACTION NEEDED:
        Review the details below, then contact the customer to verify availability and
        location, confirm the transport cost, and share payment instructions.

        CUSTOMER
        Name: {customer_name}
        Email: {customer_email}
        Phone: {customer_phone}

        BOOKING
        Service: {service_name}
        Date: {booking_date.strftime('%B %d, %Y')}
        Time: To be confirmed with customer
        Location: {location}
        {f'Location details: {location_description}' if location_description else ''}
        Attendees: {attendees}
        Service subtotal: KES {subtotal:,.2f}
        Transport: To be set after location verification
        {f'Special requests: {special_requests}' if special_requests else ''}

        Open in dashboard: {admin_url}
        {f'WhatsApp customer: {customer_whatsapp_url}' if customer_whatsapp_url else ''}

        © {datetime.now().year} Glam by Lynn. Internal notification.
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_vision_registration_confirmation(
        self,
        to_email: str,
        full_name: str,
        interests: list[str],
    ) -> bool:
        """
        Send 2026 vision registration confirmation email.

        Args:
            to_email: Registrant email
            full_name: Registrant name
            interests: List of selected interests

        Returns:
            True if sent successfully
        """
        subject = "Thank you for your interest in Glam by Lynn 2026 Vision"

        interests_html = "".join([f"<li style='margin: 5px 0;'>{interest}</li>" for interest in interests])

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">Glam by Lynn</h1>
                <p style="margin: 10px 0 0 0; font-size: 20px; color: #ec4899;">2026 Vision</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #ec4899; margin-top: 0;">Thank You for Your Interest!</h2>

                <p>Hi {full_name},</p>

                <p>Thank you for registering your interest in the Glam by Lynn 2026 Vision expansion!</p>

                <p>You've expressed interest in:</p>
                <ul style="background: white; padding: 20px 20px 20px 40px; border-radius: 8px;">
                    {interests_html}
                </ul>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>What's Next?</strong><br>
                        We'll keep you updated as we progress with our 2026 expansion plans. You'll be among the first to know when services launch in your area!
                    </p>
                </div>

                <p style="margin-top: 30px;">
                    Stay connected with us on social media for updates and beauty tips!
                </p>

                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    Best regards,<br>
                    <strong style="color: #ec4899;">The Glam by Lynn Team</strong>
                </p>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px;">
                <p>© {datetime.now().year} Glam by Lynn. All rights reserved.</p>
                <p>Kitui & Nairobi, Kenya</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        GLAM BY LYNN - 2026 VISION

        Hi {full_name},

        Thank you for registering your interest in the Glam by Lynn 2026 Vision expansion!

        You've expressed interest in:
        {chr(10).join([f'- {interest}' for interest in interests])}

        What's Next?
        We'll keep you updated as we progress with our 2026 expansion plans. You'll be among the first to know when services launch in your area!

        Stay connected with us on social media for updates and beauty tips!

        Best regards,
        The Glam by Lynn Team

        © {datetime.now().year} Glam by Lynn. All rights reserved.
        Kitui & Nairobi, Kenya
        """

        return self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
