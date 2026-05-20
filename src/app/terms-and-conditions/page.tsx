import type { Metadata } from "next";

import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "Terms & Conditions | THE ASHER STORE",
  description: "Read the terms that govern purchases and usage of THE ASHER STORE."
};

export default function TermsAndConditionsPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Terms & Conditions"
      intro="By using THE ASHER STORE website and services, you agree to the terms listed on this page."
      sections={[
        {
          title: "Orders & Pricing",
          points: [
            "Prices and availability can change without prior notice.",
            "We may cancel orders with incorrect pricing caused by technical errors.",
            "Order confirmation does not guarantee dispatch until payment verification."
          ]
        },
        {
          title: "User Responsibilities",
          points: [
            "Provide accurate delivery and contact information while ordering.",
            "Do not misuse the website or attempt unauthorized access to systems.",
            "Respect intellectual property and product content published on the site."
          ]
        },
        {
          title: "Liability",
          points: [
            "We are not liable for courier delays outside our reasonable control.",
            "Product colors may vary slightly due to screen and lighting conditions.",
            "Any disputes are subject to applicable local laws and jurisdiction."
          ]
        }
      ]}
      primaryCta={{ label: "Review Privacy Policy", href: "/privacy-policy" }}
    />
  );
}
