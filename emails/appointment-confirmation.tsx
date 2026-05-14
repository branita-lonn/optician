import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";
import * as React from "react";

interface AppointmentConfirmationEmailProps {
  customerName: string;
  appointmentType: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
}

export const AppointmentConfirmationEmail = ({
  customerName,
  appointmentType,
  scheduledDate,
  scheduledTime,
  status,
}: AppointmentConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Appointment Confirmed: {appointmentType}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={heading}>Appointment Confirmed</Heading>
        </Section>
        <Section style={content}>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Your appointment has been {status.toLowerCase()}. We look forward to seeing you!
          </Text>
          
          <Section style={detailsContainer}>
            <Text style={detailsTitle}>Appointment Details</Text>
            <Hr style={hr} />
            <div style={detailRow}>
              <Text style={detailLabel}>Service:</Text>
              <Text style={detailValue}>{appointmentType.replace(/_/g, ' ')}</Text>
            </div>
            <div style={detailRow}>
              <Text style={detailLabel}>Date:</Text>
              <Text style={detailValue}>{scheduledDate}</Text>
            </div>
            <div style={detailRow}>
              <Text style={detailLabel}>Time:</Text>
              <Text style={detailValue}>{scheduledTime}</Text>
            </div>
          </Section>

          <Text style={text}>
            If you need to reschedule or cancel, please visit your account dashboard or contact us.
          </Text>
          
          <Link
            href={`${process.env.NEXTAUTH_URL}/account/appointments`}
            style={button}
          >
            Manage Appointment
          </Link>
        </Section>
        <Hr style={hr} />
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} MiDuka Opticians. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default AppointmentConfirmationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const header = {
  padding: "32px 48px",
  textAlign: "center" as const,
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#4f46e5",
  margin: "0",
};

const content = {
  padding: "0 48px",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#484848",
};

const detailsContainer = {
  backgroundColor: "#f9fafb",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
};

const detailsTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px",
  color: "#1f2937",
};

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
};

const detailLabel = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const detailValue = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#111827",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const button = {
  backgroundColor: "#4f46e5",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
  marginTop: "24px",
};

const footer = {
  padding: "0 48px",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
};
