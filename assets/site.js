'use strict';

// Progressive enhancement: downloads and the contact form also work without JavaScript.
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const menu = $('.menu-toggle');
  const nav = $('#navigation');
  function closeMenu() {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'メニューを開く');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });

  const dialog = $('#media-dialog');
  const video = $('#dialog-video');
  let mediaTrigger;
  function showMedia(trigger) {
    mediaTrigger = trigger;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
  $$('[data-video]').forEach(button => button.addEventListener('click', () => {
    video.hidden = false;
    video.poster = 'assets/shots/basics-poster.jpg';
    video.src = 'assets/shots/basics.mp4';
    $('#dialog-title').textContent = 'PDF MARIN — 輪メニューから始まる操作デモ（音声なし）';
    showMedia(button);
    video.play().catch(() => { /* Native controls remain available. */ });
  }));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    video.pause(); video.removeAttribute('src'); video.load();
    document.body.style.overflow = '';
    mediaTrigger?.focus();
  });

  if (!/Windows/.test(navigator.userAgent) || /Windows Phone/.test(navigator.userAgent)) $('#pcnote').hidden = false;
  $('#copylink').addEventListener('click', async () => {
    const url = 'https://pdf-marin.github.io/';
    try {
      await navigator.clipboard.writeText(url);
      $('#copydone').hidden = false;
    } catch { window.prompt('このリンクをコピーしてください。', url); }
  });
  function validUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:'; } catch { return false; }
  }
  if (/^https?:$/.test(location.protocol)) {
    fetch('version.json', {cache:'no-store'})
      .then(response => { if (!response.ok) throw new Error('Version information unavailable'); return response.json(); })
      .then(version => {
        if (validUrl(version.url)) $$('[data-download]').forEach(link => { link.href = version.url; });
        if (typeof version.version === 'string') $$('[data-version]').forEach(el => { el.textContent = 'v' + version.version; });
        if (typeof version.size === 'string') $$('[data-size]').forEach(el => { el.textContent = version.size; });
        if (validUrl(version.sponsorUrl)) $$('[data-support-link]').forEach(link => { link.href = version.sponsorUrl; });
        const storeReady = version.storeAvailable === true && validUrl(version.storeUrl);
        if (storeReady) {
          $$('[data-store-link]').forEach(link => {
            link.href = version.storeUrl;
            link.hidden = false;
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          });
          $$('[data-store-pending]').forEach(el => { el.hidden = true; });
          $$('[data-store-panel]').forEach(el => { el.dataset.state = 'available'; });
          $$('[data-store-status]').forEach(el => { el.textContent = '公開中'; });
          $$('[data-store-copy]').forEach(el => {
            el.textContent = 'Microsoft Storeからインストールできます。アプリの更新もStoreが管理します。';
          });
          $$('[data-web-download]').forEach(link => {
            link.classList.add('secondary');
            const label = $('span', link);
            if (label) label.textContent = '直接ダウンロード';
          });
        }
      }).catch(() => { /* Keep the working download links already present in the HTML. */ });
  }

  const form = $('.feedback-form');
  const textarea = $('textarea', form);
  const counter = $('#character-count');
  textarea.addEventListener('input', () => {
    counter.textContent = textarea.value.length.toLocaleString('ja-JP') + ' / 4,000';
    textarea.setCustomValidity('');
  });
  // Keep the original multipart POST contract. Let the endpoint render its response.
  form.addEventListener('submit', event => {
    if (!textarea.value.trim()) {
      event.preventDefault();
      textarea.setCustomValidity('内容をご記入ください。');
      textarea.reportValidity();
    }
  });
  const input = $('#attachments');
  const dropzone = $('#dropzone');
  const list = $('#filelist');
  const note = $('#filenote');
  const maximum = 8;
  let selected = [];
  function announce(message) { note.textContent = message; note.hidden = !message; }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  if (typeof DataTransfer !== 'undefined') {
    function sync() {
      const data = new DataTransfer();
      selected.forEach(file => data.items.add(file));
      input.files = data.files;
      list.replaceChildren();
      selected.forEach((file, index) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = file.name + '（' + formatSize(file.size) + '）';
        const remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = '削除';
        remove.setAttribute('aria-label', file.name + ' を添付から削除');
        remove.addEventListener('click', () => {
          selected.splice(index, 1); announce('添付ファイルを削除しました。'); sync();
          const remaining = list.querySelectorAll('button');
          (remaining[Math.min(index, remaining.length - 1)] || input).focus();
        });
        item.append(name, remove); list.append(item);
      });
    }
    function add(files) {
      let duplicate = 0, excess = 0;
      [...files].forEach(file => {
        if (selected.some(other => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified)) { duplicate++; return; }
        if (selected.length >= maximum) { excess++; return; }
        selected.push(file);
      });
      const messages = [];
      if (excess) messages.push('添付は8件までです。' + excess + '件は追加されませんでした。');
      if (duplicate) messages.push('同じファイル' + duplicate + '件の重複を除きました。');
      announce(messages.join(' ')); sync();
    }
    input.addEventListener('change', () => add(input.files));
    ['dragenter','dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('is-drag'); }));
    ['dragleave','drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('is-drag'); }));
    dropzone.addEventListener('drop', event => { if (event.dataTransfer?.files.length) add(event.dataTransfer.files); });
    form.addEventListener('reset', () => { selected = []; setTimeout(() => { sync(); counter.textContent = '0 / 4,000'; announce(''); }, 0); });
  } else {
    input.addEventListener('change', () => input.setCustomValidity(input.files.length > maximum ? '添付ファイルは8件まで選択してください。' : ''));
  }
})();

// Public aggregate and moderated ideas; no contact data, browser storage or analytics.
(() => {
  const section=document.querySelector('#public-ideas');
  if(!section) return;
  const API='https://pdf-marin-backend.pdfmarin.workers.dev';
  const statuses={considering:'検討中',planned:'対応予定',implemented:'実装済み'};
  const votes=new Map(),commentStates=new Map();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const number=value=>Number.isSafeInteger(value)&&value>=0;
  const count=value=>value.toLocaleString('ja-JP');
  const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const say=(el,text)=>{el.hidden=false;el.textContent=text;};
  async function api(path,payload) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {
      const res=await fetch(API+path,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:undefined,body:payload?JSON.stringify(payload):undefined,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});
      const data=await res.json();
      if(!res.ok||data?.ok!==true) throw Error(typeof data?.message==='string'?data.message:'受付または表示を確認できません。再試行できます。');
      return data;
    } catch(error) {
      if(error.name==='AbortError'||error instanceof TypeError) throw Error('通信を確認できません。同じ内容で再試行してください。');
      throw error;
    } finally {clearTimeout(timer);}
  }
  function requestPayload(state,payload) {
    const fingerprint=JSON.stringify(payload);
    if(!state.payload||state.fingerprint!==fingerprint) {
      state.payload={...payload,requestId:crypto.randomUUID()};state.fingerprint=fingerprint;
    }
    // The same action keeps its UUID after a timeout or server failure.
    return state.payload;
  }
  function wireForm(form,path,read,onSuccess,state={}) {
    const button=form.querySelector('button[type=submit]'),message=form.querySelector('[role=status]');
    button.disabled=!crypto.randomUUID||!!state.done||!!state.busy;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(state.busy||state.done) return;
      if(!form.reportValidity()) return;
      const payload=read();if(!payload) return;
      state.busy=true;button.disabled=true;form.setAttribute('aria-busy','true');say(message,'送信しています…');
      try {
        const data=await api(path,requestPayload(state,payload));
        state.done=true;
        form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=true;});
        say(message,data.message);onSuccess?.(data);
      } catch(error) {say(message,error.message);}
      finally {state.busy=false;button.disabled=!!state.done;form.removeAttribute('aria-busy');}
    });
  }
  const compose=document.querySelector('.public-idea-form');
  wireForm(compose,'/ideas',()=>{
    const title=compose.elements.title.value.trim(),body=compose.elements.body.value.trim();
    if(!title||!body||compose.elements.title.value.length>80||compose.elements.body.value.length>400){say(compose.querySelector('[role=status]'),'タイトルは80文字、内容は400文字までで記入してください。');return null;}
    return {title,body,publicConsent:compose.elements.publicConsent.checked,website:compose.elements.website.value};
  });
  function validateItems(data,comments=false) {
    if(!Array.isArray(data.items)||data.items.length>50||(data.nextOffset!==null&&(!number(data.nextOffset)||data.nextOffset>1000000))) throw Error('一覧の形式を確認できません。');
    for(const item of data.items) {
      if(!uuid.test(item.id)||typeof item.body!=='string'||typeof item.createdAt!=='string')throw Error('一覧の形式を確認できません。');
      if(!comments&&(typeof item.title!=='string'||!Object.hasOwn(statuses,item.status)||!number(item.votes)||!number(item.commentCount)))throw Error('一覧の形式を確認できません。');
    }
    return data;
  }
  function commentForm(ideaId) {
    const form=node('form','public-comment-form'),label=node('label','','コメント（600文字まで）'),textarea=node('textarea');
    const heading=node('h4','','どんな使い方だと助かりますか？'),help=node('p','survey-note','使う場面や、希望する動作を教えてください。送信内容は作者にメールで通知され、内容の確認後に公開されます。');
    textarea.name='body';textarea.required=true;textarea.maxLength=600;textarea.rows=3;label.append(textarea);
    const consent=node('label','public-consent'),checkbox=node('input');checkbox.type='checkbox';checkbox.name='publicConsent';checkbox.required=true;
    consent.append(checkbox,document.createTextNode('内容の確認後に、コメントが匿名で一般公開されることを了承します。'));
    const trap=node('div','hp');trap.setAttribute('aria-hidden','true');const trapInput=node('input');trapInput.name='website';trapInput.type='text';trapInput.tabIndex=-1;trapInput.autocomplete='off';trap.append(trapInput);
    const message=node('p','public-message');message.setAttribute('role','status');const submit=node('button','btn','送信する');submit.type='submit';
    form.append(heading,help,label,consent,trap,message,submit);
    let state=commentStates.get(ideaId);if(!state){state={};commentStates.set(ideaId,state);}
    wireForm(form,'/ideas/'+ideaId+'/comments',()=>{
      const body=textarea.value.trim();if(!body||textarea.value.length>600){say(message,'コメントは600文字までで記入してください。');return null;}
      return {body,publicConsent:checkbox.checked,website:trapInput.value};
    },null,state);
    if(state.payload){textarea.value=state.payload.body;checkbox.checked=state.payload.publicConsent;}
    if(state.done){textarea.disabled=true;checkbox.disabled=true;say(message,'コメントは受け付け済みです。内容の確認後に公開します。');}
    return form;
  }
  function voteControls(item) {
    const actions=node('div','idea-actions'),vote=node('button','','応援する · '+count(item.votes)+'票'),message=node('p','public-message');message.setAttribute('role','status');vote.type='button';
    let state=votes.get(item.id);if(!state){state={};votes.set(item.id,state);}
    vote.disabled=!!state.busy||!!state.done||!crypto.randomUUID;
    if(state.done)vote.textContent='投票済み · '+count(item.votes)+'票';
    vote.addEventListener('click',async()=>{
      if(state.busy||state.done)return;state.busy=true;vote.disabled=true;say(message,'送信しています…');
      try {
        const data=await api('/ideas/'+item.id+'/vote',requestPayload(state,{}));
        state.done=true;
        if(number(data.votes)) {vote.textContent='投票済み · '+count(data.votes)+'票';const current=loadedIdeas.get(item.id)||item;current.votes=data.votes;updateDetail(current);}
        else vote.textContent='投票済み';
        say(message,data.message);
      }catch(error){say(message,error.message);}finally{state.busy=false;vote.disabled=!!state.done;}
    });
    actions.append(vote,node('span','survey-note','公開コメント '+count(item.commentCount)+'件'));const box=node('div','idea-vote-controls');box.append(actions,message);return box;
  }
  function card(item) {
    const article=node('article','idea-card');article.dataset.ideaId=item.id;
    const choose=node('button','idea-select');choose.type='button';choose.dataset.selectIdea=item.id;choose.setAttribute('aria-controls','idea-detail-'+item.id);choose.setAttribute('aria-expanded',String(selectedId===item.id));choose.setAttribute('aria-pressed',String(selectedId===item.id));
    const arrow=node('span','idea-chevron','⌄');arrow.setAttribute('aria-hidden','true');choose.append(node('strong','idea-title',item.title),arrow);
    choose.addEventListener('click',()=>selectIdea(item.id));
    choose.addEventListener('keydown',event=>{
      const all=[...ideaList.querySelectorAll('.idea-select')],index=all.indexOf(choose);
      const target=event.key==='ArrowDown'?Math.min(index+1,all.length-1):event.key==='ArrowUp'?Math.max(index-1,0):event.key==='Home'?0:event.key==='End'?all.length-1:null;
      if(target===null)return;event.preventDefault();all[target].focus();
    });
    article.append(choose);return article;
  }
  const detailCache=new Map();
  function updateDetail(item) {
    const entry=detailCache.get(item.id);if(!entry)return;
    entry.title.textContent=item.title;entry.body.textContent=item.body;entry.status.textContent=statuses[item.status];entry.meta.textContent=count(item.votes)+'票 · 公開コメント '+count(item.commentCount)+'件';entry.vote.textContent=(votes.get(item.id)?.done?'投票済み · ':'応援する · ')+count(item.votes)+'票';
  }
  function detailFor(item) {
    if(detailCache.has(item.id)){updateDetail(item);return detailCache.get(item.id);}
    const panel=node('div','idea-detail-content');panel.dataset.parentId=item.id;panel.id='idea-detail-'+item.id;
    const status=node('span','idea-status',statuses[item.status]),meta=node('p','survey-note',count(item.votes)+'票 · 公開コメント '+count(item.commentCount)+'件'),title=node('h3','',item.title),body=node('p','idea-body',item.body);
    panel.append(status,meta,title,body,voteControls(item));
    const details=node('section','idea-comments'),summary=node('h4','','コメント · 具体的な使い方'),list=node('div'),notice=node('p','public-message'),reload=node('button','public-refresh','コメントを読み直す'),more=node('button','public-refresh','さらに見る');
    notice.setAttribute('role','status');reload.type='button';more.type='button';more.hidden=true;
    const compose=node('details','idea-comment-compose'),composeSummary=node('summary','','コメントを書く');compose.append(composeSummary,commentForm(item.id));details.append(summary,list,notice,reload,more,compose);panel.append(details);
    let loaded=false,busy=false,nextOffset=null;
    async function load(offset=0) {
      if(busy)return;busy=true;reload.disabled=true;more.disabled=true;say(notice,'コメントを読み込んでいます…');
      try {
        const data=validateItems(await api('/ideas/'+item.id+'/comments?offset='+offset),true),fragment=document.createDocumentFragment();
        for(const comment of data.items) {
          const row=node('div','comment-item'),date=node('time','',comment.createdAt.slice(0,10));date.dateTime=comment.createdAt;
          row.append(date,node('p','comment-body',comment.body));fragment.append(row);
        }
        if(offset===0)list.replaceChildren(fragment);else list.append(fragment);
        loaded=true;nextOffset=data.nextOffset;more.hidden=nextOffset===null;say(notice,list.children.length?'':'公開されたコメントはまだありません。');
      }catch(error){say(notice,error.message);}finally{busy=false;reload.disabled=false;more.disabled=false;}
    }
    reload.addEventListener('click',()=>load());more.addEventListener('click',()=>{if(nextOffset!==null)load(nextOffset);});
    const entry={panel,status,meta,title,body,vote:panel.querySelector('.idea-vote-controls button'),loadOnce(){if(!loaded)load();}};detailCache.set(item.id,entry);return entry;
  }
  const ideaList=document.querySelector('#idea-list'),ideaNotice=document.querySelector('#ideas-message'),ideaRefresh=document.querySelector('#ideas-refresh'),ideaMore=document.querySelector('#ideas-more'),detailHost=document.querySelector('#idea-detail'),sortButtons=[...document.querySelectorAll('[data-idea-sort]')];
  let ideasBusy=false,nextOffset=null,selectedId=null,loadedIdeas=new Map(),currentSort='votes',desiredSort='votes';
  function mutationBusy() {return [...votes.values(),...commentStates.values()].some(state=>state.busy);}
  function selectIdea(id) {
    if(mutationBusy()){say(ideaNotice,'送信しています。完了後に別のアイデアを選べます。');return;}
    const item=loadedIdeas.get(id);if(!item)return;
    if(id===selectedId){selectedId=null;ideaList.querySelectorAll('.idea-detail-content').forEach(panel=>panel.remove());ideaList.querySelectorAll('.idea-select').forEach(b=>{b.setAttribute('aria-expanded','false');b.setAttribute('aria-pressed','false');b.closest('.idea-card').classList.remove('is-selected');});say(ideaNotice,'');return;}
    selectedId=id;const entry=detailFor(item);ideaList.querySelectorAll('.idea-detail-content').forEach(panel=>panel.remove());ideaList.querySelector('[data-idea-id="'+id+'"]').append(entry.panel);entry.loadOnce();
    ideaList.querySelectorAll('.idea-select').forEach(button=>{const active=button.dataset.selectIdea===id;button.setAttribute('aria-expanded',String(active));button.setAttribute('aria-pressed',String(active));button.closest('.idea-card').classList.toggle('is-selected',active);});
    say(ideaNotice,'');
  }
  async function loadIdeas(offset=0,sort=currentSort) {
    if(ideasBusy)return;
    if(mutationBusy()){say(ideaNotice,'送信しています。完了後に一覧を読み直せます。');return;}
    ideasBusy=true;ideaRefresh.disabled=true;ideaMore.disabled=true;sortButtons.forEach(button=>button.disabled=true);
    try {
      const data=validateItems(await api('/ideas?sort='+sort+'&offset='+offset)),fragment=document.createDocumentFragment();
      // A vote/comment may have started while this GET was in flight. Preserve its form and status.
      if(mutationBusy()){say(ideaNotice,'送信しています。完了後に一覧を読み直せます。');return;}
      if(offset===0)loadedIdeas=new Map();
      for(const item of data.items){loadedIdeas.set(item.id,item);fragment.append(card(item));}
      if(offset===0)ideaList.replaceChildren(fragment);else ideaList.append(fragment);
      currentSort=sort;desiredSort=sort;sortButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaSort===currentSort)));
      if(selectedId&&loadedIdeas.has(selectedId)){const entry=detailFor(loadedIdeas.get(selectedId));ideaList.querySelector('[data-idea-id="'+selectedId+'"]').append(entry.panel);ideaList.querySelectorAll('.idea-select').forEach(button=>{const active=button.dataset.selectIdea===selectedId;button.setAttribute('aria-expanded',String(active));button.setAttribute('aria-pressed',String(active));button.closest('.idea-card').classList.toggle('is-selected',active);});}
      else {selectedId=null;detailHost.replaceChildren();}
      nextOffset=data.nextOffset;ideaMore.hidden=nextOffset===null;say(ideaNotice,ideaList.children.length?'':'公開されたアイデアはまだありません。最初のアイデアを投稿できます。');
    }catch(error){say(ideaNotice,(ideaList.children.length?'前回取得した一覧を表示しています。 ':'')+error.message);}
    finally{ideasBusy=false;ideaRefresh.disabled=false;ideaMore.disabled=false;sortButtons.forEach(button=>button.disabled=false);}
  }
  sortButtons.forEach(button=>button.addEventListener('click',()=>{if(button.dataset.ideaSort!==currentSort){desiredSort=button.dataset.ideaSort;loadIdeas(0,desiredSort);}}));
  ideaRefresh.addEventListener('click',()=>loadIdeas(0,desiredSort));ideaMore.addEventListener('click',()=>{if(nextOffset!==null)loadIdeas(nextOffset,currentSort);});
  loadIdeas();
})();
