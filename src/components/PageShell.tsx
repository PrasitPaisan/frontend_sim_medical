type PageShellProps = {
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <section className="page-shell">
      <div className="page-shell__header">
        <div>
          <p className="page-shell__eyebrow">Clinical Operations</p>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="page-shell__content">{children}</div>
    </section>
  )
}
