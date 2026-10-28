// Draft privacy policy - accurate to what this codebase actually collects
// and does as of this writing, but not a substitute for legal review.
// Update the "Grievance Officer" contact below with a real named person
// before relying on this for India's IT Rules 2021 compliance.
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 prose">
      <h1 className="font-display text-3xl mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted mb-8">Last updated: 27 October 2026</p>

      <Section title="Who we are">
        <p>
          MQ Cart (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the MQ Cart app and website,
          a marketplace connecting residents of a society with sellers inside that same society.
          Contact: <a href="mailto:mqcarthelpdesk@gmail.com" className="underline">mqcarthelpdesk@gmail.com</a>.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account info:</strong> your name and phone number, used to sign you in (we never see or store your OTP/SMS code — that&rsquo;s handled by Firebase/Google).</li>
          <li><strong>Address:</strong> your society and flat/block number, so sellers know where to deliver.</li>
          <li><strong>Order history:</strong> what you ordered, from which shop, and its status.</li>
          <li><strong>Seller KYC (sellers only):</strong> PAN, Aadhaar (last 4 digits only), GSTIN/registration number, bank account details, and ID document images — collected to verify a seller&rsquo;s business before they can open a shop.</li>
          <li><strong>Images you upload:</strong> shop logos/banners and product photos.</li>
          <li><strong>Payment information:</strong> we never see or store your card/UPI details. Payments are processed entirely by Razorpay, a licensed payment gateway; we only receive confirmation that a payment succeeded or failed.</li>
          <li><strong>Push notification token:</strong> a device identifier used only to deliver order-update notifications to you.</li>
        </ul>
        <p className="mt-2">We do not collect your precise location, contacts, or browsing history, and we do not use advertising trackers.</p>
      </Section>

      <Section title="How we use it">
        <p>
          Solely to operate the marketplace: matching buyers with sellers in their own society,
          processing and tracking orders, verifying sellers, processing payments through Razorpay,
          and sending order-related notifications. We do not sell your personal data.
        </p>
      </Section>

      <Section title="Who we share it with">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Razorpay</strong> — to process payments.</li>
          <li><strong>Google Firebase</strong> — our hosting/database/authentication infrastructure.</li>
          <li><strong>The seller or buyer in an order</strong> — e.g. a seller sees the buyer&rsquo;s flat number and phone to fulfil an order.</li>
        </ul>
        <p className="mt-2">We don&rsquo;t share your data with anyone else, and never for advertising purposes.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account data while your account is active. If you delete your account (see{" "}
          <a href="/delete-account" className="underline">Delete your account</a>), we remove your
          profile, shop, products, and KYC documents. <strong>We retain order records</strong> that
          involve other people (your purchases, or a seller&rsquo;s sales) as financial/transaction
          history, since deleting them would also erase the other party&rsquo;s own records — your
          name is removed from your own authored content (e.g. reviews) where retained.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can view and edit your profile at any time in the app, and request full account
          deletion at <a href="/delete-account" className="underline">/delete-account</a>. For any
          other request about your data, contact us at{" "}
          <a href="mailto:mqcarthelpdesk@gmail.com" className="underline">mqcarthelpdesk@gmail.com</a>.
        </p>
      </Section>

      <Section title="Grievance Officer">
        <p>
          In accordance with India&rsquo;s Information Technology Rules, 2021, the Grievance
          Officer for MQ Cart can be reached at{" "}
          <a href="mailto:mqcarthelpdesk@gmail.com" className="underline">mqcarthelpdesk@gmail.com</a>.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>We&rsquo;ll update this page if what we collect or how we use it changes.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="font-medium text-lg mb-2">{title}</h2>
      {children}
    </section>
  );
}
