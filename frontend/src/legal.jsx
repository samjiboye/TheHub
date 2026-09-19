import React from "react";
import { Header } from "./shared";
import { FONT_DISPLAY, NEUTRAL_HERO_GRADIENT, colors } from "./theme";

const LAST_UPDATED = "September 2026";

function LegalSection({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-base mb-1.5" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>
        {title}
      </h3>
      <div className="text-sm leading-relaxed" style={{ color: colors.creamDim }}>
        {children}
      </div>
    </div>
  );
}

// Draft only -- written to give TheHub a reasonable, working starting policy,
// not reviewed by a lawyer. Given this covers a real Nigerian business
// handling personal data (photos, phone numbers, home addresses), it's
// worth having a Nigerian lawyer review this against NDPR before treating
// it as final.
function TermsOfServiceView({ onBack }) {
  return (
    <div className="pb-10 fixed inset-0 z-50 overflow-y-auto" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="Terms of Service" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        <p className="text-xs mb-5" style={{ color: colors.creamDim }}>Last updated: {LAST_UPDATED}</p>

        <LegalSection title="1. Who we are">
          <p>
            TheHub (thehubbooking.com) is operated by AJIBOYE HUB VENTURES (RC-9776073), a business registered
            in Nigeria. TheHub is a booking marketplace that connects customers with independent salons, barbers,
            spas, and other grooming professionals ("Owners").
          </p>
        </LegalSection>

        <LegalSection title="2. What TheHub is — and isn't">
          <p className="mb-2">
            TheHub helps customers discover and book appointments with Owners. We do not employ Owners, and we
            are not a party to the service each Owner provides — the actual haircut, style, treatment, or other
            service is a private arrangement between the customer and the Owner.
          </p>
          <p>
            TheHub does not process payments. Customers pay Owners directly, in person, at the time of service.
            We are not responsible for the quality, safety, or outcome of any service booked through the app.
          </p>
        </LegalSection>

        <LegalSection title="3. Creating an account">
          <p>
            You must provide accurate information when creating an account and keep it up to date. You're
            responsible for anything that happens under your account, so keep your password private. You must
            be legally able to enter into agreements in Nigeria to use TheHub.
          </p>
        </LegalSection>

        <LegalSection title="4. Owner responsibilities">
          <p>
            If you register as an Owner, you're responsible for the accuracy of your listed services, prices,
            and availability, and for honoring bookings you accept. You agree to only offer services you are
            legally permitted to provide.
          </p>
        </LegalSection>

        <LegalSection title="5. Customer responsibilities">
          <p>
            You agree to honor bookings you make, show up on time, and pay the Owner directly for services
            received. Repeated no-shows or cancellations may affect your ability to use TheHub.
          </p>
        </LegalSection>

        <LegalSection title="6. Cancellations and disputes">
          <p>
            Either side may cancel a booking through the app, with a reason. If something goes wrong with a
            service, we encourage customers and Owners to resolve it directly first. TheHub may review disputes
            flagged through the app but is not obligated to mediate or compensate either party, since we are not
            the service provider.
          </p>
        </LegalSection>

        <LegalSection title="7. Prohibited conduct">
          <p>
            Don't use TheHub to harass, discriminate against, or defraud another user; post false or misleading
            listings; attempt to circumvent the platform to avoid its policies; or use the service for anything
            illegal under Nigerian law.
          </p>
        </LegalSection>

        <LegalSection title="8. Loyalty rewards and referrals">
          <p>
            Any loyalty discount, visit-tracking, or referral feature in the app is offered at TheHub's and the
            relevant Owner's discretion and may change or end at any time.
          </p>
        </LegalSection>

        <LegalSection title="9. Account suspension">
          <p>
            We may suspend or remove an account that violates these terms, provides false information, or
            repeatedly causes problems for other users.
          </p>
        </LegalSection>

        <LegalSection title="10. Limitation of liability">
          <p>
            TheHub is provided "as is." To the fullest extent permitted by Nigerian law, we are not liable for
            any loss, injury, or damage arising from a service booked through the app, or from Owner or customer
            conduct — those are matters between the two of you.
          </p>
        </LegalSection>

        <LegalSection title="11. Changes to these terms">
          <p>
            We may update these terms as TheHub grows. If we make a significant change, we'll let you know in
            the app. Continuing to use TheHub after a change means you accept the updated terms.
          </p>
        </LegalSection>

        <LegalSection title="12. Governing law">
          <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
        </LegalSection>

        <LegalSection title="13. Contact">
          <p>Questions about these terms? Reach us at hello@thehubbooking.com.</p>
        </LegalSection>
      </div>
    </div>
  );
}

function PrivacyPolicyView({ onBack }) {
  return (
    <div className="pb-10 fixed inset-0 z-50 overflow-y-auto" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="Privacy Policy" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        <p className="text-xs mb-5" style={{ color: colors.creamDim }}>Last updated: {LAST_UPDATED}</p>

        <LegalSection title="1. Who's responsible for your data">
          <p>
            AJIBOYE HUB VENTURES (RC-9776073), operating TheHub (thehubbooking.com), is the data controller for
            the personal information described below.
          </p>
        </LegalSection>

        <LegalSection title="2. What we collect">
          <p className="mb-2">When you use TheHub, we may collect:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Name, email address, and phone number</li>
            <li>Your password, stored in encrypted (hashed) form — we never see it in plain text</li>
            <li>A profile photo, if you add one</li>
            <li>For Owners: business photos and videos, service listings, and pricing</li>
            <li>Booking details, including your home address if you book or offer a home visit</li>
            <li>Messages sent through TheHub's in-app chat</li>
            <li>Basic device and usage information needed to keep the app secure and working properly</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Why we collect it">
          <p>
            We use this information to run TheHub: creating your account, matching customers with Owners,
            processing bookings, enabling in-app chat, verifying check-ins, showing loyalty progress, and
            keeping the platform secure. We don't sell your personal data.
          </p>
        </LegalSection>

        <LegalSection title="4. Who we share it with">
          <p className="mb-2">
            We share the minimum necessary information with a small number of service providers who help us run
            TheHub:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Cloudinary — stores photos and videos you upload</li>
            <li>Render — hosts our servers and database</li>
            <li>Resend and Zoho Mail — deliver account and verification emails</li>
            <li>Google and Apple — only if you choose to sign in with a Google or Apple account</li>
          </ul>
          <p className="mt-2">
            A customer and an Owner can see each other's name, photo, and booking details necessary to complete
            an appointment. We don't share your data with anyone else without telling you, unless required by
            Nigerian law.
          </p>
        </LegalSection>

        <LegalSection title="5. How long we keep it">
          <p>
            We keep your account information for as long as your account is active, and for a reasonable period
            afterward in case you return or as required for legal or accounting purposes. You can ask us to
            delete your account and data at any time.
          </p>
        </LegalSection>

        <LegalSection title="6. Your rights">
          <p className="mb-2">Under Nigeria's Data Protection Act, you have the right to:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Ask what personal data we hold about you</li>
            <li>Ask us to correct inaccurate data</li>
            <li>Ask us to delete your data or account</li>
            <li>Withdraw consent for us to process your data, where consent is the basis for processing</li>
          </ul>
          <p className="mt-2">To exercise any of these, email hello@thehubbooking.com.</p>
        </LegalSection>

        <LegalSection title="7. Security">
          <p>
            We take reasonable technical steps to protect your data, including encrypted password storage and
            secure connections. No system is 100% secure, so we can't guarantee absolute security, but we work
            to keep your information safe.
          </p>
        </LegalSection>

        <LegalSection title="8. Children">
          <p>TheHub is not intended for anyone under 18. We don't knowingly collect data from children.</p>
        </LegalSection>

        <LegalSection title="9. Changes to this policy">
          <p>
            We may update this policy as TheHub grows. We'll let you know in the app if we make a significant
            change.
          </p>
        </LegalSection>

        <LegalSection title="10. Contact">
          <p>Questions about your data? Reach us at hello@thehubbooking.com.</p>
        </LegalSection>
      </div>
    </div>
  );
}

export { TermsOfServiceView, PrivacyPolicyView };
