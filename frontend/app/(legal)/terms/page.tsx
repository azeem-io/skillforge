import { LegalProse } from "@/components/layout/legal-prose";
import { Placeholder } from "@/components/layout/legal-placeholder";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms · SkillForge",
  description: "The terms you agree to by using SkillForge.",
};

const UPDATED = "28 August 2026";

export default function TermsPage() {
  return (
    <LegalProse>
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Terms of use
        </h1>
        <p className="mt-2">Last updated {UPDATED}.</p>
      </div>

      <p>
        By creating an account on SkillForge you agree to what follows. It is
        short on purpose. SkillForge is operated by{" "}
        <Placeholder>OPERATOR NAME</Placeholder>; questions go to{" "}
        <Placeholder>CONTACT EMAIL</Placeholder>.
      </p>

      <h2>What SkillForge is</h2>
      <p>
        A study tool. It assesses skills, estimates the gap to a role, generates
        a suggested learning order, and schedules revision. It is{" "}
        <strong>not</strong> a qualification, an accreditation, a recruitment
        service, or careers advice from a qualified adviser. Nothing it produces
        certifies anything about you to anyone.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>
          Use a real email address you control. You are responsible for what
          happens under your account, so pick a password you do not use
          elsewhere.
        </li>
        <li>
          One account per person. Do not share it or sign in as somebody else.
        </li>
        <li>You must be 16 or older to create an account.</li>
        <li>
          Do not upload anything to your portfolio that is not yours to upload,
          and do not upload other people&rsquo;s personal information.
        </li>
      </ul>

      <h2>Fair use</h2>
      <p>
        The assistant and the career agent cost real money to run per question.
        Use them as a person would. Automated querying, scraping, or attempts to
        exhaust the service are not allowed, and accounts doing that may be rate
        limited or suspended without warning.
      </p>
      <p>
        Also please do not attempt to break into other people&rsquo;s accounts,
        probe the service for vulnerabilities without telling us, or upload
        malware. If you find a security problem, report it — see the{" "}
        <a href="/privacy">privacy page</a>.
      </p>

      <h2>What the AI produces</h2>
      <p>
        Roadmap ordering, gap calculations and readiness scores are computed
        deterministically from the skill graph — no language model decides them.
        The written explanations, the assistant&rsquo;s answers and the
        agent&rsquo;s recommendations <em>are</em> model-generated, and models
        get things wrong. Treat them as a well-read study partner, not as fact.
        Check anything that matters before you act on it.
      </p>
      <p>
        Answers from the assistant cite the source they were drawn from. Where
        one is cited, read it.
      </p>

      <h2>Your content</h2>
      <p>
        What you write and upload stays yours. You give us only the permission
        needed to run the service — to store it, show it back to you, and show
        it to a mentor or administrator as described in the{" "}
        <a href="/privacy">privacy page</a>. We claim no other rights over it and
        will not publish it.
      </p>

      <h2>Ending it</h2>
      <p>
        You can delete your account at any time from your profile; it is
        immediate and permanent. We may suspend an account that breaks these
        terms. If the service is discontinued we will give reasonable notice so
        you can export your data first.
      </p>

      <h2>No warranty</h2>
      <p>
        SkillForge is provided as-is, without warranty of any kind. It runs on a
        single server and may be unavailable, lose recent work, or be withdrawn.
        Do not rely on it as the only copy of anything you care about — export
        your data if it matters to you. To the extent the law allows, the
        operator is not liable for any loss arising from your use of it.
      </p>
      <p>
        Nothing here limits any right you have that cannot legally be limited.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the law of{" "}
        <Placeholder>JURISDICTION</Placeholder>.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If a change is significant, the date above
        changes and we will say so on the dashboard. Continuing to use
        SkillForge after that means you accept the update.
      </p>
    </LegalProse>
  );
}
