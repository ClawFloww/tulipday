export const metadata = {
  title: "Privacy Policy — TulipDay",
  description: "Privacy policy for the TulipDay app.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: "#444", lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 10 }}>{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 6, paddingLeft: 4 }}>
      {children}
    </li>
  );
}

export default function PrivacyPage() {
  const year = new Date().getFullYear();

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#FAFAF9",
      padding: "0 0 60px",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#E8334A",
        padding: "48px 24px 32px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🌷</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>
          TulipDay
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
          Privacy Policy
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>

        <p style={{ fontSize: 13, color: "#999", marginBottom: 32 }}>
          Last updated: April {year} · Effective immediately
        </p>

        <Section title="1. Who we are">
          <P>
            TulipDay is a mobile app that helps users discover tulip fields, bloom statuses,
            and scenic routes across the Netherlands. The app is operated by TulipDay
            (contact: <a href="mailto:hello@tulipday.nl" style={{ color: "#E8334A" }}>hello@tulipday.nl</a>).
          </P>
        </Section>

        <Section title="2. No account required">
          <P>
            TulipDay does not require you to create an account or provide any personal
            information to use the app. A random anonymous session ID is generated and
            stored locally on your device the first time you open the app.
          </P>
        </Section>

        <Section title="3. What we store — and where">
          <P>The following data is stored <strong>locally on your device only</strong> (browser localStorage / native app storage):</P>
          <ul style={{ paddingLeft: 20 }}>
            <Li>Your anonymous session ID (randomly generated, not linked to you)</Li>
            <Li>Saved locations and routes (your favourites list)</Li>
            <Li>Onboarding preferences (intent, transport mode, time available)</Li>
            <Li>Your chosen language (Dutch or English)</Li>
          </ul>
          <P>
            <strong>None of this data is sent to or stored on TulipDay servers.</strong>
          </P>
        </Section>

        <Section title="4. What we do NOT collect">
          <ul style={{ paddingLeft: 20 }}>
            <Li>Your name, email address, or any contact information</Li>
            <Li>Your location history</Li>
            <Li>Device identifiers or advertising IDs</Li>
            <Li>Usage analytics or tracking data</Li>
            <Li>Payment information (handled entirely by Apple / Google)</Li>
          </ul>
        </Section>

        <Section title="5. Location data">
          <P>
            The app can optionally request access to your device location to show nearby
            tulip fields. This is used only in the moment you press &ldquo;Near me&rdquo; — the
            coordinates are never stored on our servers and are never shared with third
            parties. You can deny location permission and still use the full app.
          </P>
        </Section>

        <Section title="6. Third-party services">
          <P>TulipDay uses the following third-party services:</P>
          <ul style={{ paddingLeft: 20 }}>
            <Li>
              <strong>Supabase</strong> — hosts the database of public location and route
              information. Only public, non-personal data (tulip field descriptions, bloom
              statuses) is fetched from Supabase. No user data is sent.
            </Li>
            <Li>
              <strong>MapLibre GL</strong> — open-source map rendering library, runs
              entirely on-device. No data is sent to external map servers.
            </Li>
            <Li>
              <strong>Vercel</strong> — hosts the web version of the app. Standard server
              access logs may be retained by Vercel per their own privacy policy.
            </Li>
            <Li>
              <strong>Apple App Store / Google Play</strong> — if you download the app via
              a store, their respective privacy policies apply to the download process.
            </Li>
          </ul>
        </Section>

        <Section title="7. Premium subscription">
          <P>
            If you purchase a TulipDay Premium subscription, payment is processed entirely
            by Apple (App Store) or Google (Play Store). TulipDay does not receive or store
            your payment details. A premium status flag is stored locally on your device.
          </P>
        </Section>

        <Section title="8. Children">
          <P>
            TulipDay is suitable for all ages. We do not knowingly collect any data from
            children under 13, and the app collects no personal data from any user.
          </P>
        </Section>

        <Section title="9. Your rights">
          <P>
            Because TulipDay stores no personal data on its servers, there is nothing to
            request, correct, or delete from our side. To remove all locally stored app
            data, clear the app storage in your device settings or uninstall the app.
          </P>
        </Section>

        <Section title="10. Changes to this policy">
          <P>
            We may update this privacy policy from time to time. The date at the top of
            this page reflects the most recent revision. Continued use of the app after
            changes constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="11. Contact">
          <P>
            Questions about this privacy policy?{" "}
            <a href="mailto:hello@tulipday.nl" style={{ color: "#E8334A", fontWeight: 600 }}>
              hello@tulipday.nl
            </a>
          </P>
        </Section>

        <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "32px 0" }} />

        {/* Dutch version */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", marginBottom: 24 }}>
          🇳🇱 Nederlands
        </h2>

        <Section title="1. Wie zijn wij">
          <P>
            TulipDay is een mobiele app waarmee gebruikers tulpenvelden, bloeistatus en
            routes in Nederland kunnen ontdekken. Contact:{" "}
            <a href="mailto:hello@tulipday.nl" style={{ color: "#E8334A" }}>hello@tulipday.nl</a>.
          </P>
        </Section>

        <Section title="2. Geen account vereist">
          <P>
            TulipDay vereist geen account. Bij het eerste gebruik wordt een willekeurig
            anoniem sessie-ID aangemaakt en lokaal op jouw apparaat opgeslagen.
          </P>
        </Section>

        <Section title="3. Wat we opslaan — en waar">
          <P>De volgende gegevens worden <strong>alleen lokaal op jouw apparaat</strong> opgeslagen:</P>
          <ul style={{ paddingLeft: 20 }}>
            <Li>Jouw anonieme sessie-ID (willekeurig gegenereerd, niet aan jou gekoppeld)</Li>
            <Li>Opgeslagen locaties en routes (jouw favorietenlijst)</Li>
            <Li>Onboarding-voorkeuren (intent, vervoersmiddel, beschikbare tijd)</Li>
            <Li>Gekozen taal (Nederlands of Engels)</Li>
          </ul>
          <P>
            <strong>Geen van deze gegevens wordt naar TulipDay-servers verzonden.</strong>
          </P>
        </Section>

        <Section title="4. Wat we niet verzamelen">
          <ul style={{ paddingLeft: 20 }}>
            <Li>Naam, e-mailadres of andere contactgegevens</Li>
            <Li>Locatiegeschiedenis</Li>
            <Li>Apparaat-IDs of reclame-IDs</Li>
            <Li>Gebruiksanalyses of trackingdata</Li>
            <Li>Betaalgegevens (volledig via Apple / Google)</Li>
          </ul>
        </Section>

        <Section title="5. Locatiegegevens">
          <P>
            De app kan optioneel toegang vragen tot jouw locatie om nabijgelegen velden te
            tonen. De coördinaten worden nooit opgeslagen op onze servers en nooit gedeeld
            met derden. Je kunt locatietoegang weigeren en de app nog steeds volledig
            gebruiken.
          </P>
        </Section>

        <Section title="6. Contact & jouw rechten">
          <P>
            Vragen over dit beleid?{" "}
            <a href="mailto:hello@tulipday.nl" style={{ color: "#E8334A", fontWeight: 600 }}>
              hello@tulipday.nl
            </a>
          </P>
          <P>
            Omdat TulipDay geen persoonsgegevens op servers opslaat, kun je alle
            app-gegevens verwijderen door de app-opslag te wissen in je apparaatinstellingen
            of de app te verwijderen.
          </P>
        </Section>

        <div style={{ textAlign: "center", paddingTop: 16, color: "#ccc", fontSize: 12 }}>
          © {year} TulipDay · All rights reserved
        </div>
      </div>
    </div>
  );
}
