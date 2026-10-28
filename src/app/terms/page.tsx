// Draft terms of service - a reasonable baseline, not a substitute for
// legal review before relying on it for real disputes.
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Terms of Service</h1>
      <p className="text-sm text-muted mb-8">Last updated: 27 October 2026</p>

      <Section title="What MQ Cart is">
        <p>
          MQ Cart is a marketplace that connects buyers and sellers within the same residential
          society. We provide the platform; <strong>sellers are independent businesses</strong>{" "}
          responsible for their own listings, pricing, stock, and delivery. MQ Cart is not the
          seller of record for any product sold through the app.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          You must provide accurate information and keep your account secure. You&rsquo;re
          responsible for activity on your account. Sellers additionally agree to provide accurate
          KYC information and only sell what they&rsquo;re legally permitted to sell.
        </p>
      </Section>

      <Section title="Orders and payments">
        <p>
          Orders are placed directly with a seller through the app. Payments are processed by
          Razorpay; MQ Cart never stores your card or bank details. Delivery is handled by the
          seller, not MQ Cart.
        </p>
      </Section>

      <Section title="Cancellations and refunds">
        <p>
          A buyer may cancel an order while it&rsquo;s still awaiting the seller&rsquo;s
          acceptance. A seller may decline an order with a stated reason. If an order paid for
          online is cancelled or declined, the payment is automatically refunded to the original
          payment method.
        </p>
      </Section>

      <Section title="Prohibited use">
        <p>
          You may not use MQ Cart to list or sell illegal goods, impersonate another person or
          business, submit false reviews, or attempt to access another user&rsquo;s account or
          data.
        </p>
      </Section>

      <Section title="Reviews and content">
        <p>
          Reviews must reflect a genuine purchase. We may remove content that violates these terms
          or applicable law. Report a concern to{" "}
          <a href="mailto:mqcarthelpdesk@gmail.com" className="underline">mqcarthelpdesk@gmail.com</a>.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          MQ Cart provides the platform &ldquo;as is&rdquo;. We&rsquo;re not liable for disputes
          between buyers and sellers, product quality, or delivery delays, which are the
          responsibility of the seller.
        </p>
      </Section>

      <Section title="Changes">
        <p>We may update these terms; continued use of the app means you accept the current version.</p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms:{" "}
          <a href="mailto:mqcarthelpdesk@gmail.com" className="underline">mqcarthelpdesk@gmail.com</a>.
        </p>
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
