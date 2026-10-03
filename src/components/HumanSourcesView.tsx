import { useEffect, useMemo, useState } from "react";
import { useSoundCloudQueue } from "../hooks/useSoundCloudQueue";
import { QueueControls } from "./QueueControls";

interface HumanResource {
  id: string; title: string; provider: string; level: string; pageUrl: string; embedUrl?: string;
}

export function HumanSourcesView() {
  const [resources, setResources] = useState<HumanResource[]>([]);
  const [loadError, setLoadError] = useState("");
  const [provider, setProvider] = useState("all");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/human-sources.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setResources).catch(error => { if (error.name !== "AbortError") setLoadError("Não foi possível carregar o catálogo. Recarregue a página."); });
    return () => controller.abort();
  }, []);
  const visible = useMemo(() => resources.filter(item =>
    (provider === "all" || item.provider === provider) && (level === "all" || item.level === level) &&
    `${item.title} ${item.provider}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())), [resources, provider, level, search]);
  const playable = useMemo(() => visible.filter(item => item.embedUrl), [visible]);
  const urls = useMemo(() => playable.map(item => new URL(item.embedUrl!).searchParams.get("url")!), [playable]);
  const queue = useSoundCloudQueue(urls);
  const index = queue.index;
  const active = playable[index] ?? playable[0];
  const choose = queue.choose;
  return <section className="audio-lab">
    <aside className="audio-browser">
      <p className="section-kicker">ELLLO · British Council · ESLPod</p>
      <h2>Mais vozes humanas</h2>
      <p>Conversas completas para ouvir sem pressa. Filtre por fonte, nível ou assunto.</p>
      <div className="audio-filter-row">
        <label>Fonte<select value={provider} onChange={e => setProvider(e.target.value)}><option value="all">Todas</option>{["ELLLO", "British Council", "ESLPod"].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Nível<select value={level} onChange={e => setLevel(e.target.value)}><option value="all">Todos</option>{["A1", "A2", "B1", "B2", "C1", "Livre"].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <label className="source-search">Buscar assunto<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Family, travel, work…" /></label>
      <p className="dialogue-count">{playable.length} gravações tocáveis aqui · {visible.length - playable.length} acessos à fonte</p>
      {loadError && <p role="alert">{loadError}</p>}
      {!loadError && !resources.length && <p role="status">Carregando catálogo…</p>}
      {!!resources.length && !visible.length && <p>Nenhum resultado. Experimente outro filtro.</p>}
      <div className="audio-list">{visible.map(item => item.embedUrl ?
        <button type="button" key={item.id} className={active?.id === item.id ? "active" : ""} onClick={() => choose(playable.indexOf(item))}><span>{item.level}</span><strong>{item.title}</strong><small>ELLLO · player oficial</small></button> :
        <a className="source-lesson" href={item.pageUrl} key={item.id} target="_blank" rel="noreferrer" onClick={queue.stop}><span>{item.level}</span><strong>{item.title}</strong><small>{item.provider} · ouvir na fonte ↗</small></a>)}</div>
    </aside>
    <article className="audio-stage">
      <header><div><p className="card-category">Conversa completa · voz humana</p><h2>{active?.title ?? "Ouça nas fontes oficiais"}</h2></div>{active && <span className="audio-position">{index + 1} / {playable.length}</span>}</header>
      {active ? <>
        <p>ELLLO · {active.level} · player oficial do SoundCloud. Requer internet.</p>
        <iframe ref={queue.iframe} title="Player oficial ELLLO" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(urls[0])}&auto_play=false&show_user=true`} width="100%" height="166" allow="autoplay" className="source-player" />
        <QueueControls settings={queue.settings} onChange={queue.configure} running={queue.running} repetition={queue.repetition} onStart={queue.start} disabled={!queue.ready} onStop={queue.stop} count={playable.length} />
        <p>Use o play do player para ouvir uma vez. Se o navegador bloquear o início automático, toque no play do player e depois inicie a fila.</p>
        {queue.running && <p role="status">Ouvindo {index + 1} de {playable.length}: {active.title} · repetição {queue.repetition}</p>}
        {!queue.ready && <p role="status">Carregando player oficial. Se ele não carregar, abra a aula original abaixo.</p>}
        {queue.error && <p className="coach-notice" role="alert">{queue.error} Você também pode abrir a aula original abaixo.</p>}
        <div className="audio-shortcuts"><button type="button" disabled={index === 0} onClick={() => choose(index - 1)}>← Anterior</button><button type="button" disabled={index + 1 >= playable.length} onClick={() => choose(index + 1)}>Próxima →</button></div>
        <p><a href={active.pageUrl} target="_blank" rel="noreferrer" onClick={queue.stop}>Abrir aula, transcrição e exercícios no ELLLO ↗</a></p>
      </> : <p>Escolha uma aula na lista para ouvir no site da fonte. Os filtros também encontram conversas do ELLLO para a fila automática.</p>}
      <footer className="audio-credit">British Council e ESLPod: os áudios e materiais são acessados nas páginas oficiais. A aula gratuita do ESLPod muda semanalmente; o podcast reúne episódios e opções de assinatura. Os níveis do ELLLO e British Council seguem os catálogos das fontes.</footer>
    </article>
  </section>;
}
