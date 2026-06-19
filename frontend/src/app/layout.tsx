import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RescueNet AI — Disaster Response Command Center",
  description:
    "Multi-agent AI system for disaster response, survivor prioritization, hospital coordination, and rescue planning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
