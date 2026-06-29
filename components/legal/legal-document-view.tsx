import type { LegalDocumentContent } from "@/lib/legal/types";

type LegalDocumentViewProps = {
  document: LegalDocumentContent;
  lastUpdatedLabel: string;
};

export function LegalDocumentView({
  document,
  lastUpdatedLabel,
}: LegalDocumentViewProps) {
  return (
    <article className="prose-legal">
      <p className="text-sm text-muted-foreground">
        {lastUpdatedLabel}: {document.lastUpdated}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-foreground">{document.intro}</p>

      <div className="mt-8 flex flex-col gap-8">
        {document.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="mt-3 text-sm leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
            {section.list ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {section.list.map((item) => (
                  <li key={item.slice(0, 48)}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
