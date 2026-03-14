interface SectionHeaderProps {
  label: string;
  headline?: string;
  subhead?: string;
}

export function SectionHeader({ label, headline, subhead }: SectionHeaderProps) {
  return (
    <div className="mb-12 md:mb-16 text-center">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-accent mb-4">
        {label}
      </p>
      {/* Accent rule */}
      <div className="h-px w-8 bg-accent mx-auto mt-1 mb-4" />
      {headline && (
        <h2 className="text-3xl md:text-5xl font-bold text-text tracking-tight mb-4">
          {headline}
        </h2>
      )}
      {subhead && (
        <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          {subhead}
        </p>
      )}
    </div>
  );
}
