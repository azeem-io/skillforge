import { LegalProse } from "@/components/layout/legal-prose";
import { Placeholder } from "@/components/layout/legal-placeholder";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What SkillForge collects, why, and who else sees it.",
};

const UPDATED = "28 August 2026";

export default function PrivacyPage() {
  return (
    <LegalProse>
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Privacy
        </h1>
        <p className="mt-2">Last updated {UPDATED}.</p>
      </div>

      <p>
        SkillForge is a study tool. It measures what you know, works out the gap
        to a role you pick, and schedules what to revisit. Doing that means
        holding a record of what you answered and when — this page says exactly
        what that record contains and who else can see it.
      </p>

      <p>
        SkillForge is operated by <Placeholder>OPERATOR NAME</Placeholder>. For
        anything on this page, contact{" "}
        <Placeholder>CONTACT EMAIL</Placeholder>.
      </p>

      <h2>What we hold</h2>

      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email, name, password</td>
            <td>
              To sign you in. The password is stored only as an argon2id hash —
              it is never kept, logged or recoverable in readable form.
            </td>
          </tr>
          <tr>
            <td>Profile — headline, bio, education, experience level</td>
            <td>Written by you, shown on your own profile.</td>
          </tr>
          <tr>
            <td>Target role</td>
            <td>Everything on the dashboard is measured against it.</td>
          </tr>
          <tr>
            <td>Skill levels, and whether each came from a test or your own claim</td>
            <td>
              The left-hand side of every gap calculation. The source matters:
              a claim and a demonstrated result are weighted differently.
            </td>
          </tr>
          <tr>
            <td>Assessment attempts — every answer, whether it was right, when</td>
            <td>
              To score you per skill, show you what you missed, and start the
              review schedule.
            </td>
          </tr>
          <tr>
            <td>Review schedule and history</td>
            <td>
              To work out when a skill is likely slipping and worth revisiting.
            </td>
          </tr>
          <tr>
            <td>Projects, certifications, and any CV you upload</td>
            <td>Your portfolio. Entirely optional.</td>
          </tr>
          <tr>
            <td>Generated roadmaps</td>
            <td>
              Kept rather than recomputed, so regenerating shows movement
              instead of overwriting it.
            </td>
          </tr>
          <tr>
            <td>Sessions — IP address, browser user agent, timestamps</td>
            <td>
              To keep you signed in and to rate-limit sign-in attempts. This is
              the only place we record an IP address.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Who else sees it</h2>

      <h3>Mentors and administrators</h3>
      <p>
        If an administrator assigns you a mentor, that mentor can see your
        profile, your skill levels and your assessment scores with the per-skill
        breakdown — that is the point of having one. They cannot see the
        individual answers you gave. A mentor sees only the students assigned to
        them. An administrator can see every account and change roles.
      </p>

      <h3>DeepSeek</h3>
      <p>
        The assistant, the career agent and the roadmap narration are generated
        by a large language model run by{" "}
        <a href="https://www.deepseek.com" rel="noreferrer noopener">
          DeepSeek
        </a>
        , which is outside the EU and the UK. When you use one of those
        features, what leaves this server is: <strong>your question</strong>,{" "}
        <strong>your skill levels</strong>, <strong>your target role</strong>,
        and <strong>recent assessment titles and scores</strong>.
      </p>
      <p>
        <strong>Your name, email address and CV are never sent to DeepSeek.</strong>{" "}
        If you would rather nothing at all went to a model, simply do not use
        the assistant, the agent or roadmap generation — the assessments, graph,
        tree and review scheduling work entirely on this server and involve no
        third party.
      </p>

      <h3>Hosting</h3>
      <p>
        The application and its database run on a single virtual server rented
        from <Placeholder>HOSTING PROVIDER AND REGION</Placeholder>. Nobody else
        processes your data.
      </p>

      <h3>Nobody else</h3>
      <p>
        There is no analytics, no advertising, no tracking pixels and no
        third-party scripts of any kind. We do not sell or share your data. The
        only cookie is the one that keeps you signed in; it is essential to the
        service and is not used to track you.
      </p>

      <h2>Your rights</h2>
      <p>
        Two of these are buttons rather than requests — go to{" "}
        <a href="/profile">your profile</a>:
      </p>
      <ul>
        <li>
          <strong>Take your data with you.</strong> Download everything we hold
          about you as a single JSON file, including every answer you have ever
          given.
        </li>
        <li>
          <strong>Delete your account.</strong> Immediate and permanent. It
          removes your profile, skills, portfolio, uploaded files, every
          attempt and answer, your review schedule and history, your roadmaps
          and your sessions. It cannot be undone and there is no backup copy we
          will restore for you.
        </li>
        <li>
          <strong>Correct anything.</strong> Your profile, skill claims,
          projects and certifications are all editable.
        </li>
      </ul>
      <p>
        If a mentor or an administrator contributed learning resources, those
        stay in the shared library after they delete their account, with their
        name removed. Deleting a person should not delete the library.
      </p>
      <p>
        Depending on where you live you may also have the right to object to
        processing or to complain to a data protection regulator. Write to{" "}
        <Placeholder>CONTACT EMAIL</Placeholder> and we will help.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Until you delete your account, at which point it goes immediately. Sessions
        expire on their own after seven days.
      </p>

      <h2>Security</h2>
      <p>
        Traffic is encrypted with TLS. Passwords are hashed with argon2id at the
        OWASP baseline. Sessions are checked against a live database row, so
        signing out genuinely ends the session. Uploaded files are restricted to
        PDF, PNG and JPEG, capped at 5&nbsp;MB, and served only to you and the
        staff assigned to you.
      </p>
      <p>
        No system is perfectly secure. If you find a vulnerability, please report
        it to <Placeholder>CONTACT EMAIL</Placeholder> rather than disclosing it
        publicly, and we will get to it quickly.
      </p>

      <h2>Changes</h2>
      <p>
        If this page changes in a way that affects what we do with your data, we
        will update the date at the top and say so on the dashboard.
      </p>
    </LegalProse>
  );
}
