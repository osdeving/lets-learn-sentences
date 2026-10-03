import type { QueueSettings } from "../hooks/useListeningQueue";

export function QueueControls({ settings, onChange, running, repetition, onStart, onStop, disabled = false, count, title = "Escuta automática" }: {
  settings: QueueSettings; onChange: (settings: QueueSettings) => void; running: boolean; repetition: number;
  onStart: () => void; onStop: () => void; disabled?: boolean; count: number; title?: string;
}) {
  return <section className="queue-controls" aria-label={title}>
    <div><h3>{title}</h3><p>Ouça a seleção atual, repita e avance sem precisar clicar em cada frase.</p></div>
    <div className="queue-settings">
      <label>Repetições por item<input type="number" min="1" max="20" value={settings.repeats} onChange={e => onChange({ ...settings, repeats: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} /></label>
      <label>Pausa entre áudios (ms)<input type="number" min="0" max="10000" step="100" value={settings.gap} onChange={e => onChange({ ...settings, gap: Math.max(0, Math.min(10000, Number(e.target.value) || 0)) })} /></label>
      <label className="check-row"><input type="checkbox" checked={settings.continuous} onChange={e => onChange({ ...settings, continuous: e.target.checked })} /> Avançar automaticamente</label>
      <label className="check-row"><input type="checkbox" checked={settings.loop} onChange={e => onChange({ ...settings, loop: e.target.checked })} /> Recomeçar ao chegar ao fim</label>
    </div>
    <div className="queue-actions"><button className="listen-button" disabled={disabled} onClick={running ? onStop : onStart} type="button">{running ? "■ Pausar escuta" : "▶ Iniciar escuta automática"}</button><span role="status">{running ? `Repetição ${repetition} de ${settings.repeats}` : `${count} itens na seleção · ${settings.repeats}× · pausa de ${settings.gap} ms`}</span></div>
  </section>;
}
