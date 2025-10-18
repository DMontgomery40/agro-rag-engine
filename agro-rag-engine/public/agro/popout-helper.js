export const Popout = (() => {
  const MAX_CHUNK_BYTES = 200 * 1024;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  function encode(obj){return enc.encode(JSON.stringify(obj));}
  function decode(bytes){return JSON.parse(dec.decode(bytes));}
  function chunkBytes(bytes){const chunks=[];for(let i=0;i<bytes.length;i+=MAX_CHUNK_BYTES){chunks.push(bytes.slice(i,i+MAX_CHUNK_BYTES));}return chunks;}
  function create({getState,applyState,onSyncEvent}={}){
    const url = new URL(window.location.href);
    const sid = url.searchParams.get('sid');
    const mode = url.searchParams.get('mode');
    const isPopout = mode === 'popout' && !!sid;
    let channel=null, assembling=null;
    function initChannel(sessionId){
      channel = new BroadcastChannel(`agro-session-${sessionId}`);
      channel.onmessage = (ev)=>{
        const { type } = ev.data || {};
        if (type==='state-chunk-init'){ const { total, version } = ev.data; assembling={version,total,parts:[],received:0}; }
        else if (type==='state-chunk-part' && assembling){ assembling.parts.push(new Uint8Array(ev.data.bytes)); assembling.received++; }
        else if (type==='state-chunk-done' && assembling){ const full = new Uint8Array(assembling.parts.reduce((s,p)=>s+p.byteLength,0)); let o=0; for (const p of assembling.parts){ full.set(p,o); o+=p.byteLength; } const state = decode(full); assembling=null; applyState && applyState(state); }
        else if (type==='sync-event'){ onSyncEvent && onSyncEvent(ev.data.event); }
        else if (type==='request-state'){ sendFullState(); }
      };
    }
    function sendFullState(){ if(!channel||!getState) return; const snap=getState(); const bytes=encode(snap); const chunks=chunkBytes(bytes); const version=crypto.randomUUID(); channel.postMessage({type:'state-chunk-init', total:chunks.length, version}); for(const c of chunks){ channel.postMessage({type:'state-chunk-part', version, bytes:c}); } channel.postMessage({type:'state-chunk-done', version}); }
    function sendSyncEvent(event){ if(!channel) return; channel.postMessage({type:'sync-event', event}); }
    function openPopout({path='/agro/index.html', features='noopener,noreferrer'}={}){ const sessionId=crypto.randomUUID(); initChannel(sessionId); const popUrl=new URL(path, window.location.origin); popUrl.searchParams.set('mode','popout'); popUrl.searchParams.set('sid',sessionId); window.open(popUrl.toString(),'_blank',features); setTimeout(()=>sendFullState(),300); window.addEventListener('beforeunload',()=>{ try{ channel && channel.close(); }catch{} }); return { sessionId, channel, sendSyncEvent, sendFullState }; }
    function bootIfPopout(){ if(!isPopout) return null; initChannel(sid); channel.postMessage({type:'request-state'}); window.addEventListener('beforeunload',()=>{ try{ channel && channel.close(); }catch{} }); return { sessionId: sid, channel, sendSyncEvent }; }
    return { isPopout, openPopout, bootIfPopout, sendFullState, sendSyncEvent };
  }
  return { create };
})();