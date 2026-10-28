// Deliberately public (no RoleGuard) - Play Store policy requires an
// account-deletion path reachable without logging into the app.
export default function DeleteAccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Delete your account</h1>
      <p className="text-muted mb-8">
        Deleting your account removes your profile, and if you have a shop, your shop, its
        products, and your KYC documents. We keep order records that involve other people (your
        past purchases, or a seller&rsquo;s sales) as transaction history — see our{" "}
        <a href="/privacy" className="underline">Privacy Policy</a> for details. This can&rsquo;t
        be undone.
      </p>

      <div className="border border-line rounded-2xl bg-surface p-6 mb-6">
        <h2 className="font-medium text-lg mb-2">Option 1 — In the app (fastest)</h2>
        <p className="text-sm text-ink/80">
          Sign in, go to <strong>Profile</strong>, and tap <strong>Delete my account</strong> at
          the bottom. It takes effect immediately.
        </p>
      </div>

      <div className="border border-line rounded-2xl bg-surface p-6">
        <h2 className="font-medium text-lg mb-2">Option 2 — Without signing in</h2>
        <p className="text-sm text-ink/80">
          Email{" "}
          <a href="mailto:mqcarthelpdesk@gmail.com?subject=Delete%20my%20MQ%20Cart%20account" className="underline">
            mqcarthelpdesk@gmail.com
          </a>{" "}
          from any address, with the phone number registered on your account, and ask us to
          delete it. We&rsquo;ll confirm once it&rsquo;s done, usually within a few days.
        </p>
      </div>
    </div>
  );
}
