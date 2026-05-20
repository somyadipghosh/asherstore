import type { Metadata } from "next";

import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy | THE ASHER STORE",
  description: "Understand how THE ASHER STORE collects and uses personal data."
};

export default function PrivacyPolicyPage() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Privacy Policy"
      intro="Your privacy matters. We only collect information needed to process orders and improve your shopping experience."
      sections={[
        {
          title: "What We Collect",
          points: [
            "Order details like name, delivery address, and contact number.",
            "Account information such as email and encrypted login credentials.",
            "Anonymous usage data to improve product discovery and checkout flow."
          ]
        },
        {
          title: "How We Use It",
          points: [
            "To process purchases, shipping updates, and support requests.",
            "To prevent fraud and keep payments secure.",
            "To improve sizing recommendations, offers, and product suggestions."
          ]
        },
        {
          title: "Your Choices",
          points: [
            "Request updates or corrections to your account information.",
            "Ask us to remove your account data when legally permitted.",
            "Unsubscribe from promotional messages at any time."
          ]
        }
      ]}
      primaryCta={{ label: "Read Terms & Conditions", href: "/terms-and-conditions" }}
    />
  );
}
