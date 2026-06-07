import { Card } from '@ecom/ui';
import { FileText, type LucideIcon } from 'lucide-react';

import { PageHero } from './page-hero';

export interface LegalSection {
  title: string;
  body: string;
}

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  effectiveDate?: string;
  sections: LegalSection[];
}

export function LegalPage({ icon = FileText, title, description, effectiveDate, sections }: Props) {
  return (
    <div className="space-y-8">
      <PageHero icon={icon} title={title} description={description} accent="primary" />

      {effectiveDate && (
        <div className="text-sm text-muted-foreground">
          <strong>Kuchga kirgan:</strong> {effectiveDate}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <Card className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bo&apos;limlar
            </div>
            <ol className="space-y-1 text-sm">
              {sections.map((s, i) => (
                <li key={i}>
                  <a
                    href={`#section-${i}`}
                    className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </Card>
        </aside>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <section key={i} id={`section-${i}`} className="scroll-mt-32">
              <h2 className="mb-2 text-xl font-bold">
                {i + 1}. {s.title}
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
