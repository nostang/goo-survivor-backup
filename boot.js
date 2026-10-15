/* The small inline shell remains usable even when this file cannot load. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), status=$('#boot-message');
  const base=new URL('./',location.href);
  const offline=$('#offline-status');
  function fail(){ window.gooBootFailure(); }
  function timed(p,ms=18000){return new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(Error('timeout')),ms);p.then(v=>{clearTimeout(id);resolve(v)},e=>{clearTimeout(id);reject(e)});});}
  async function retry(fn){let error;for(let i=0;i<3;i++){try{return await fn()}catch(e){error=e;}}throw error;}
  function resource(path,kind){const load=()=>timed(new Promise((resolve,reject)=>{
    const e=kind==='css'?document.createElement('link'):kind==='image'?new Image():document.createElement('script');
    if(kind==='css'){e.rel='stylesheet';e.href=new URL(path,base);}else e.src=new URL(path,base);
    e.onload=()=>resolve(e);e.onerror=()=>{e.remove?.();reject(Error(path));};
    if(kind!=='image')document.head.appendChild(e);
  }));return kind==='script'?load():retry(load);}
  async function prepareOffline(){
    if(!('serviceWorker' in navigator)||!window.isSecureContext){offline.textContent='此瀏覽器未提供離線功能，請保持連線。';return;}
    offline.textContent='正在準備離線檔案，完成前請保持連線…';
    try {
      const reg=await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.href,updateViaCache:'none'});
      const showWaiting=()=>{if(reg.waiting)offline.textContent='新版已下載。結束遊戲後，關閉所有遊戲分頁再開啟即可更新。';};
      function inspect(){
        showWaiting();
        if(reg.installing){const installing=reg.installing;installing.addEventListener('statechange',()=>{if(installing.state==='redundant')offline.textContent='離線檔案尚未備妥，下次連線開啟時會重試。';showWaiting();});}
      }
      reg.addEventListener('updatefound',inspect);inspect();
      const ready=await timed(navigator.serviceWorker.ready,90000);
      // Ask the active worker to verify every expected entry, not merely its existence.
      const channel=new MessageChannel();
      const answer=timed(new Promise(resolve=>{channel.port1.onmessage=e=>resolve(e.data);}),12000);
      ready.active.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
      const data=await answer;channel.port1.close();
      offline.textContent=data.complete?'離線檔案已備妥 · 此裝置可離線遊玩（瀏覽器清除資料後需重新下載）':'離線檔案不完整，請連線後重新開啟以補齊。';
      showWaiting();
    } catch(_){offline.textContent='離線功能暫時無法使用；本次仍可遊玩，下次開啟會重試。';}
  }
  async function boot(){
    const response=await retry(()=>timed(fetch(new URL('asset-manifest.json',base),{cache:'no-cache'})));
    if(!response.ok)throw Error('manifest');
    const manifest=await response.json();
    if(!Array.isArray(manifest.files)||manifest.version!=='v1.3.0')throw Error('version');
    await Promise.all(['styles.css?v=1.3.0','ui-system.css?v=1.3.0'].map(p=>resource(p,'css')));
    const assets=manifest.files.filter(f=>/\.(png|jpe?g|svg|webp)$/i.test(f.path));
    let done=0,index=0;const retained=[];
    await Promise.all(Array.from({length:6},async()=>{while(index<assets.length){const f=assets[index++];retained.push(await resource(f.path,'image'));status.textContent=`正在準備遊戲圖片 ${++done} / ${assets.length}…`;}}));
    status.textContent='正在啟動遊戲…';
    for(const path of ['world.js?v=1.3.0','audio.js?v=37','game.js?v=1.3.0'])await resource(path,'script');
    if(!window.GooBootReady)throw Error('startup');
    clearTimeout(window.gooBootWatchdog);$('#boot-screen').hidden=true;$('#app').inert=false;
    prepareOffline();
  }
  boot().catch(fail);
})();
