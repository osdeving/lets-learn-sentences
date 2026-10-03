import { useEffect, useState } from "react";

interface OfflineManifest { version: string; cacheName?: string; files: Array<{ url: string; bytes: number; audio: boolean }> }
export function OfflinePanel() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("Prepare todos os áudios uma vez. Depois, estude com a rede desligada.");
  const [percent,setPercent]=useState(0);
  const [bytes,setBytes]=useState(0);
  const [ready,setReady]=useState(false);
  const check = async () => {
    try {
      const manifest: OfflineManifest = await fetch(import.meta.env.BASE_URL + 'offline-manifest.json').then(r=>{if(!r.ok)throw new Error();return r.json();});
      setBytes(manifest.files.reduce((n,f)=>n+f.bytes,0));
      const cache=await caches.open(manifest.cacheName ?? manifest.version);
      const states=await Promise.all(manifest.files.map(f=>cache.match(f.url)));
      if(states.every(Boolean)){setReady(true);setPercent(100);setMessage("Conteúdo e áudios preparados para usar offline neste navegador.");}
    } catch { /* Development has no production offline manifest. */ }
  };
  useEffect(()=>{void check();},[]);
  const prepare=async()=>{
    setBusy(true);setReady(false);setPercent(0);setMessage("Preparando os arquivos locais…");
    try {
      if(!('serviceWorker' in navigator))throw new Error("Este navegador não oferece modo offline.");
      if(import.meta.env.DEV)throw new Error("Use o build de produção (pnpm build e pnpm preview) para preparar o modo offline.");
      await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js');
      const registration=await navigator.serviceWorker.ready;
      await new Promise<void>((resolve,reject)=>{
        const channel=new MessageChannel();
        const timer=window.setTimeout(()=>{channel.port1.close();reject(new Error("O preparo demorou demais. Tente novamente; os arquivos já salvos serão aproveitados."));},180000);
        channel.port1.onmessage=event=>{
          const data=event.data;
          if(data.type==='progress'){setPercent(Math.round(data.done/data.total*100));setMessage(`Salvando ${data.done} de ${data.total} arquivos…`);}
          if(data.type==='complete'){window.clearTimeout(timer);channel.port1.close();resolve();}
          if(data.type==='error'){window.clearTimeout(timer);channel.port1.close();reject(new Error(data.message));}
        };
        if(!registration.active){window.clearTimeout(timer);reject(new Error("Modo offline ainda não está ativo. Aguarde e tente de novo."));return;}
        registration.active.postMessage({type:'PREPARE_OFFLINE'},[channel.port2]);
      });
      setPercent(100);setReady(true);setMessage("Pronto: conteúdo e áudios disponíveis offline neste navegador.");
    }catch(reason){setMessage(reason instanceof Error?reason.message:"Não foi possível preparar os arquivos.");}
    finally{setBusy(false);}
  };
  return <section className="coach-offline"><div><h3>{ready?"✓ Pronto para usar em casa":"Todo o listening no aparelho"}</h3><p role="status">{message}</p>{bytes>0&&<small>{(bytes/1048576).toFixed(1)} MB · sem conta nem API de áudio</small>}</div><button className="record-button" disabled={busy} onClick={()=>void prepare()} type="button">{busy?`${percent}%` : ready?"Verificar / preparar novamente":"Preparar modo offline"}</button>{busy&&<progress max="100" value={percent} aria-label="Preparo do modo offline" />}</section>;
}
