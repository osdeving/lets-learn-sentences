interface HeaderProps {
  studiedCount: number;
  totalCount: number;
}

export function Header({ studiedCount, totalCount }: HeaderProps) {
  const percent = totalCount ? Math.min((studiedCount / totalCount) * 100, 100) : 0;
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Ouvir Inglês — início">
        <span className="brand-mark" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        <span>Ouvir <strong>Inglês</strong></span>
      </a>
      <div className="progress-pill" aria-label="Progresso de estudo">
        <span>{studiedCount.toLocaleString("pt-BR")} estudadas</span>
        <span className="progress-track"><span style={{ width: `${percent}%` }} /></span>
      </div>
    </header>
  );
}
