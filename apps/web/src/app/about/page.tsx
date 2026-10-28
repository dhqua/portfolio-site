import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About' };

const AboutPage = () => (
  <main className="space-y-8">
    <h1 className="text-3xl font-semibold">About</h1>
    <section className="space-y-3">
      <p>
        I&apos;m a product-minded engineer who ships software on cloud platforms, with a focus on
        AI-enabled workflows and the integrations that make them useful.
      </p>
      <p>
        I like turning a vague operational problem into something running in production: scoping it
        with the people who feel it, building it, and staying close enough to see whether it worked.
      </p>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">What I bring</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>End-to-end delivery.</strong> Requirements through production, including
          automations that cut multi-day document processing to minutes.
        </li>
        <li>
          <strong>AI agents with guardrails.</strong> Agent workflow design, MCP integrations, and
          the security and governance reviews that decide whether they ever reach users.
        </li>
        <li>
          <strong>Integration and platform work.</strong> API design with vendors, payment and
          financial systems, and CI/CD automation.
        </li>
        <li>
          <strong>Customer discovery and communication.</strong> Interviews, roadmaps, and clear
          updates for technical and executive audiences.
        </li>
      </ul>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Why this site</h2>
      <p>
        Every month I build one project and write up the decisions, tradeoffs, and mistakes. The
        site itself is the first one: serverless on AWS, defined in code, and deployed without
        stored credentials.
      </p>
    </section>
  </main>
);

export default AboutPage;
