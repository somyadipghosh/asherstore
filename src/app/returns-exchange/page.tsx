import type { Metadata } from "next";

import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "Exchange | THE ASHER STORE",
  description: "Read how exchanges work for jerseys purchased from THE ASHER STORE."
};

export default function ReturnsExchangePage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="CREATE A EXCHANGE"
      intro="If your jersey is damaged or defective, we will assist you with an exchange through a simple process."
      sections={[
        {
          title: "Who Can Request",
          points: [
            "Requests must be raised within 24 hours from delivery.",
            "Products must be unused, unwashed, and in original packaging with all the tags.",
            "Customized jerseys are not eligible for exchanges."
          ]
        },
        {
          title: "How to Start",
          points: [
            "Share your order number and reason for exchange through our contact page.",
            "Our team confirms eligibility and pickup details within 24-48 hours.",
            "Once approved, the exchange pickup window is shared by WhatsApp."
          ]
        },
        {
          title: "EXCHANGES ARE DISPATCHED AFTER QUALITY CHECK OF THE RETURNED ITEM",
          points: []
        }
      ]}
      primaryCta={{ label: "Contact Support", href: "/contact-us" }}
    />
  );
}
