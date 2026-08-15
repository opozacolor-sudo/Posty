import type {
  HowItWorksContent,
  HowItWorksFormat,
  HowItWorksPlatform,
  HowItWorksStatus,
} from "@/lib/how-it-works/types";

const STATUS_STYLES: Record<HowItWorksStatus, string> = {
  live: "bg-green/10 text-green",
  review: "bg-amber-500/10 text-amber-700",
  soon: "bg-muted text-muted-foreground",
  none: "bg-muted/80 text-muted-foreground",
};

type HowItWorksViewProps = {
  content: HowItWorksContent;
  lastUpdatedLabel: string;
  statusLabels: Record<HowItWorksStatus, string>;
  tableHeaders: {
    format: string;
    media: string;
    status: string;
    command: string;
  };
};

function StatusBadge({
  status,
  label,
}: {
  status: HowItWorksStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}

function PlatformCard({
  platform,
  statusLabels,
  tableHeaders,
}: {
  platform: HowItWorksPlatform;
  statusLabels: Record<HowItWorksStatus, string>;
  tableHeaders: HowItWorksViewProps["tableHeaders"];
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border bg-card px-4 py-3">
        <div>
          <h3 className="text-base font-bold text-foreground">{platform.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{platform.summary}</p>
        </div>
        <StatusBadge status={platform.status} label={statusLabels[platform.status]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-2 font-semibold">{tableHeaders.format}</th>
              <th className="px-4 py-2 font-semibold">{tableHeaders.media}</th>
              <th className="px-4 py-2 font-semibold">{tableHeaders.status}</th>
              <th className="px-4 py-2 font-semibold">{tableHeaders.command}</th>
            </tr>
          </thead>
          <tbody>
            {platform.formats.map((format: HowItWorksFormat) => (
              <tr key={`${platform.name}-${format.name}`} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-medium text-foreground">{format.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{format.media}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={format.status} label={statusLabels[format.status]} />
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{format.howTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HowItWorksView({
  content,
  lastUpdatedLabel,
  statusLabels,
  tableHeaders,
}: HowItWorksViewProps) {
  return (
    <article>
      <p className="text-sm text-muted-foreground">
        {lastUpdatedLabel}: {content.lastUpdated}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-foreground">{content.intro}</p>

      <div className="mt-8 flex flex-col gap-10">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
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
            {section.platforms ? (
              <div className="mt-4 flex flex-col gap-4">
                {section.platforms.map((platform) => (
                  <PlatformCard
                    key={platform.name}
                    platform={platform}
                    statusLabels={statusLabels}
                    tableHeaders={tableHeaders}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
