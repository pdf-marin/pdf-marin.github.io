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
  const kind=form.elements.kind;
  const templates={want:'【ほしい機能】\n\n【使いたい場面】\n\n【できるとうれしいこと】\n',hard:'【使いにくいところ】\n\n【今の操作】\n\n【希望する動き】\n'};
  const templateOnly=value=>Object.values(templates).some(template=>value.replace(/\s/g,'')===template.replace(/\s/g,''));
  let lastTemplate=null;
  kind.addEventListener('change',()=>{const template=templates[kind.value]||'';if(!textarea.value.trim()||textarea.value===lastTemplate||templateOnly(textarea.value)){textarea.value=template;lastTemplate=template||null;textarea.dispatchEvent(new Event('input',{bubbles:true}));}});
  // Keep the original multipart POST contract. Let the endpoint render its response.
  form.addEventListener('submit', event => {
    if (!textarea.value.trim()||templateOnly(textarea.value)) {
      event.preventDefault();
      textarea.setCustomValidity(templateOnly(textarea.value)?'見出しの下にご希望を記入してください。':'内容をご記入ください。');
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

// Author-curated ideas and comments; anonymous poll identity uses browser storage.
(() => {
  const section=document.querySelector('#public-ideas');
  if(!section) return;
  const API='https://pdf-marin-backend.pdfmarin.workers.dev';
  const statuses={considering:'検討中',planned:'対応予定',implemented:'実装済み'};
  const votes=new Map(),commentStates=new Map(),pollStates=new Map();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const number=value=>Number.isSafeInteger(value)&&value>=0;
  const count=value=>value.toLocaleString('ja-JP');
  const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const say=(el,text)=>{el.hidden=false;el.textContent=text;};
  async function api(path,payload,extraHeaders={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {
      const res=await fetch(API+path,{method:payload?'POST':'GET',headers:{...(payload&&!(payload instanceof FormData)?{'Content-Type':'application/json'}:{}),...extraHeaders},body:payload?(payload instanceof FormData?payload:JSON.stringify(payload)):undefined,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});
      const data=await res.json();
      if(!res.ok||data?.ok!==true){const error=Error(typeof data?.message==='string'?data.message:'受付または表示を確認できません。再試行できます。');error.status=res.status;throw error;}
      return data;
    } catch(error) {
      if(error.name==='AbortError'||error instanceof TypeError) throw Error('通信を確認できません。同じ内容で再試行してください。');
      throw error;
    } finally {clearTimeout(timer);}
  }
  function requestPayload(state,payload) {
    const {files=[],...fields}=payload;
    const fingerprint=JSON.stringify(fields);
    const sameFiles=state.payload&&files.length===(state.payload.files||[]).length&&files.every((file,i)=>file===state.payload.files[i]);
    if(!state.payload||state.fingerprint!==fingerprint||!sameFiles) {
      state.payload={...fields,...(files.length?{files:files.slice()}:{}),requestId:crypto.randomUUID()};state.fingerprint=fingerprint;
    }
    // The same action keeps its UUID after a timeout or server failure.
    return state.payload;
  }
  function encodeAction(payload) {
    const {files=[],...fields}=payload;
    if(!files.length){delete fields.attachmentPublicConsent;return fields;}
    const data=new FormData();for(const[key,value]of Object.entries(fields))data.append(key,String(value));
    files.forEach(file=>data.append('files',file,file.name));return data;
  }
  function makeAttachmentFields() {
    const box=node('fieldset','public-attachments');box.append(node('legend','','添付（任意）'),node('p','survey-note','PNG・JPEG・PDFを3件まで。1件5MB、合計10MBまで。1つのアイデア全体ではコメントの添付を含め150件までです。個人情報や機密情報は取り除いてください。保存容量に余裕があるときに受け付けます。'));
    const label=node('label','','ファイルを選ぶ'),input=node('input');input.type='file';input.name='files';input.multiple=true;input.accept='image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf';label.append(input);
    const list=node('ul','filelist');list.dataset.selectedFiles='';const consent=node('label','public-consent'),check=node('input');check.type='checkbox';check.name='attachmentPublicConsent';consent.append(check,document.createTextNode('添付も公開してよい'));
    const message=node('p','public-message');message.dataset.fileMessage='';message.setAttribute('role','status');box.append(label,list,consent,node('p','survey-note','チェックしない添付は作者だけが確認できます。チェックした添付も、作者が個別に承認してから公開します。'),message);return box;
  }
  function attachmentControl(form,state) {
    const input=form.elements.files,consent=form.elements.attachmentPublicConsent,list=form.querySelector('[data-selected-files]'),message=form.querySelector('[data-file-message]');
    if(!input)return {files:()=>[],consent:()=>false,lock(){}};
    state.files=state.files||[];if(state.payload)consent.checked=state.payload.attachmentPublicConsent===true;
    function redraw(){list.replaceChildren();state.files.forEach((file,i)=>{const row=node('li'),remove=node('button','','外す');remove.type='button';remove.disabled=!!state.busy||!!state.done;row.append(node('span','',file.name+'（'+(file.size/1048576).toFixed(1)+' MB）'),remove);remove.addEventListener('click',()=>{if(state.busy||state.done)return;state.files.splice(i,1);state.payload=null;redraw();});list.append(row);});}
    input.addEventListener('change',()=>{
      if(state.busy||state.done){input.value='';return;}
      const files=[...input.files],merged=state.files.slice();let error='';
      for(const file of files){if(!['image/png','image/jpeg','application/pdf'].includes(file.type)){error='PNG・JPEG・PDFを選んでください。';break;}if(file.size===0||file.size>5*1048576){error='添付は1件5MBまでです。空のファイルは送れません。';break;}if(merged.length>=3||merged.reduce((n,f)=>n+f.size,0)+file.size>10*1048576){error='添付は3件、合計10MBまでです。';break;}merged.push(file);}
      input.value='';if(error){say(message,error);return;}state.files=merged;state.payload=null;say(message,'');redraw();
    });
    consent.addEventListener('change',()=>{if(!state.busy&&!state.done)state.payload=null;});redraw();
    return {files:()=>state.files.slice(),consent:()=>consent.checked,reset(){state.files=[];consent.checked=false;input.value='';redraw();},lock(value){input.disabled=value;consent.disabled=value;list.querySelectorAll('button').forEach(b=>b.disabled=value);}};
  }
  function checkedFiles(items) {
    if(!Array.isArray(items)||items.length>150)throw Error('添付の一覧を確認できません。');
    for(const f of items){if(!uuid.test(f.id)||typeof f.name!=='string'||!number(f.size)||!['image/png','image/jpeg','application/pdf'].includes(f.mime)||f.url!=='/files/'+f.id+'/content'||(f.commentId!==null&&!uuid.test(f.commentId)))throw Error('添付の一覧を確認できません。');}return items;
  }
  function renderFileLinks(parent,files) {
    parent.querySelector(':scope > .published-files')?.remove();if(!files.length)return;
    const list=node('ul','published-files');for(const file of files){const row=node('li'),link=node('a','',file.name+'（'+(file.size/1048576).toFixed(1)+' MB）');link.href=API+file.url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';row.append(link);list.append(row);}parent.append(list);
  }

  function wireForm(form,path,read,onSuccess,state={}) {
    const button=form.querySelector('button[type=submit]'),message=form.querySelector(':scope > [role=status]');
    const attachments=attachmentControl(form,state);
    button.disabled=!crypto.randomUUID||!!state.done||!!state.busy;attachments.lock(!!state.done||!!state.busy);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(state.busy||state.done) return;
      if(!form.reportValidity()) return;
      const payload=read();if(!payload) return;
      Object.assign(payload,{files:attachments.files(),attachmentPublicConsent:attachments.consent()});
      state.busy=true;listMutationEpoch++;button.disabled=true;attachments.lock(true);if(state.repeatable)form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=true;});form.setAttribute('aria-busy','true');say(message,'送信しています…');
      try {
        const data=await api(path,encodeAction(requestPayload(state,payload)));
        state.done=true;
        form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=true;});
        say(message,data.message);await onSuccess?.(data);if(state.repeatable){state.done=false;state.payload=null;state.fingerprint=null;form.reset();attachments.reset();form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=false;});}
      } catch(error) {say(message,error.message);}
      finally {state.busy=false;if(state.repeatable&&!state.done)form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=false;});attachments.lock(!!state.done);button.disabled=!!state.done;form.removeAttribute('aria-busy');}
    });
  }
  function validateItems(data,comments=false) {
    if(!Array.isArray(data.items)||data.items.length>50||(data.nextOffset!==null&&(!number(data.nextOffset)||data.nextOffset>1000000))) throw Error('一覧の形式を確認できません。');
    for(const item of data.items) {
      if(!uuid.test(item.id)||typeof item.body!=='string'||typeof item.createdAt!=='string')throw Error('一覧の形式を確認できません。');
      if(!comments&&(typeof item.title!=='string'||!Object.hasOwn(statuses,item.status)||!number(item.votes)||!number(item.commentCount)))throw Error('一覧の形式を確認できません。');
    }
    return data;
  }
  function commentForm(ideaId,onSent) {
    const form=node('form','public-comment-form'),label=node('label','','コメント（600文字まで）'),textarea=node('textarea');
    const heading=node('h4','','どんな使い方だと助かりますか？'),help=node('p','survey-note','使う場面や、希望する動作を教えてください。送信したコメントは、作者にもメールで通知されます。');
    textarea.name='body';textarea.required=true;textarea.maxLength=600;textarea.rows=3;label.append(textarea);
    const publicNotice=node('p','survey-note','文字だけのコメントは投稿内容を自動で確認し、問題がなければ匿名で公開されます。画像やPDFを添えたコメントは、本文も作者が確認してから公開します。個人情報は記入しないでください。');
    const trap=node('div','hp');trap.setAttribute('aria-hidden','true');const trapInput=node('input');trapInput.name='website';trapInput.type='text';trapInput.tabIndex=-1;trapInput.autocomplete='off';trap.append(trapInput);
    const message=node('p','public-message');message.setAttribute('role','status');const submit=node('button','btn','送信する');submit.type='submit';
    form.append(heading,help,label,makeAttachmentFields(),trap,message,publicNotice,submit);
    let state=commentStates.get(ideaId);if(!state){state={};commentStates.set(ideaId,state);}
    state.repeatable=true;
    wireForm(form,'/ideas/'+ideaId+'/comments',()=>{
      const body=textarea.value.trim();if(!body||textarea.value.length>600){say(message,'コメントは600文字までで記入してください。');return null;}
      return {body,publicConsent:true,website:trapInput.value};
    },onSent,state);
    if(state.payload){textarea.value=state.payload.body;}
    if(state.done){textarea.disabled=true;say(message,'コメントは送信済みです。');}
    return form;
  }
  function voteControls(item) {
    const actions=node('div','idea-actions'),vote=node('button','','応援する'),message=node('p','public-message');message.setAttribute('role','status');vote.type='button';
    let state=votes.get(item.id);if(!state){state={};votes.set(item.id,state);}
    vote.disabled=!!state.busy||!!state.done||!crypto.randomUUID;
    if(state.done)vote.textContent='応援済み';
    vote.addEventListener('click',async()=>{
      if(state.busy||state.done)return;state.busy=true;listMutationEpoch++;vote.disabled=true;say(message,'送信しています…');
      try {
        const data=await api('/ideas/'+item.id+'/vote',requestPayload(state,{}));
        state.done=true;
        if(number(data.votes)) {vote.textContent='応援済み';const current=loadedIdeas.get(item.id)||item;current.votes=data.votes;updateDetail(current);}
        else vote.textContent='応援済み';
        say(message,data.message);
      }catch(error){say(message,error.message);}finally{state.busy=false;vote.disabled=!!state.done;}
    });
    actions.append(vote,node('span','survey-note','公開コメント '+count(item.commentCount)+'件'));const box=node('div','idea-vote-controls');box.append(actions,message);return box;
  }
  function card(item) {
    const article=node('article','idea-card');article.dataset.ideaId=item.id;
    const choose=node('button','idea-select');choose.type='button';choose.dataset.selectIdea=item.id;choose.setAttribute('aria-controls','idea-detail-'+item.id);choose.setAttribute('aria-expanded',String(selectedId===item.id));choose.setAttribute('aria-pressed',String(selectedId===item.id));
    const topic=node('span','idea-topic');topic.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');svg.setAttribute('class','icon');use.setAttribute('href','#i-spark');svg.append(use);topic.append(svg);
    const titleBlock=node('span','idea-title-block');titleBlock.append(node('strong','idea-title',item.title),node('span','idea-summary-meta','応援 '+count(item.votes)+' · コメント '+count(item.commentCount)));
    const arrow=node('span','idea-chevron','⌄');arrow.setAttribute('aria-hidden','true');choose.append(topic,titleBlock,node('span','idea-status',statuses[item.status]),arrow);
    choose.addEventListener('click',()=>selectIdea(item.id));
    choose.addEventListener('keydown',event=>{
      const all=[...ideaList.querySelectorAll('.idea-select')],index=all.indexOf(choose);
      const target=event.key==='ArrowDown'?Math.min(index+1,all.length-1):event.key==='ArrowUp'?Math.max(index-1,0):event.key==='Home'?0:event.key==='End'?all.length-1:null;
      if(target===null)return;event.preventDefault();all[target].focus();
    });
    const poll=pollFor(item.id);article.append(choose,poll.host);
    if(pollObserver)pollObserver.observe(article);else poll.load();
    return article;
  }
  const pollTokenKey='pdfmarin.poll.identity.v1';let pollToken='',identityPromise=null;
  function forgetPollIdentity(){pollToken='';try{localStorage.removeItem(pollTokenKey);}catch{}}
  try{const value=localStorage.getItem(pollTokenKey);if(typeof value==='string'&&value.length>0&&value.length<=4096)pollToken=value;}catch{/* In-memory identity still permits voting in this tab. */}
  async function pollIdentity(){if(pollToken)return pollToken;if(!identityPromise)identityPromise=api('/polls/identity',{}).then(data=>{if(typeof data.voterToken!=='string'||!data.voterToken||data.voterToken.length>4096)throw Error('投票の準備を確認できません。');pollToken=data.voterToken;try{localStorage.setItem(pollTokenKey,pollToken);}catch{}return pollToken;}).finally(()=>identityPromise=null);return identityPromise;}
  function validPoll(poll){
    if(poll===null)return null;
    if(!poll||!uuid.test(poll.id)||typeof poll.question!=='string'||poll.question.length>120||!Array.isArray(poll.options)||poll.options.length<2||poll.options.length>6||!number(poll.totalVotes)||typeof poll.closed!=='boolean')throw Error('アンケートの内容を確認できません。');
    const ids=new Set();for(const option of poll.options){if(!uuid.test(option.id)||ids.has(option.id)||typeof option.label!=='string'||option.label.length>80||!number(option.votes)||!Number.isFinite(option.percent)||option.percent<0||option.percent>100)throw Error('アンケートの内容を確認できません。');ids.add(option.id);if(option.imageUrl&&(option.imageFileId===null||!uuid.test(option.imageFileId)||option.imageUrl!=='/files/'+option.imageFileId+'/content'))throw Error('アンケートの画像を確認できません。');}
    return poll;
  }
  function publicPoll(parent,host){
    const state={busy:false,payload:null,fingerprint:null,poll:null,loaded:false,loading:false,selected:null,editing:false,notice:''};pollStates.set(parent,state);
    async function load(preserveChoice=false){
      if(state.loading||state.loaded)return;state.loading=true;
      try{
        const sentToken=pollToken;let data;try{data=await api('/ideas/'+parent+'/poll',undefined,sentToken?{'x-poll-voter':sentToken}:{});}catch(error){if(error.status!==403||!sentToken)throw error;if(pollToken===sentToken)forgetPollIdentity();data=await api('/ideas/'+parent+'/poll');}
        state.poll=validPoll(data.poll);state.selected=state.poll?.selectedOptionId||(preserveChoice&&state.poll?.options.some(o=>o.id===state.selected)?state.selected:null);state.loaded=true;render();
      }catch(error){
        const notice=node('p','public-message',error.message),retry=node('button','public-refresh poll-retry','アンケートを読み直す');notice.setAttribute('role','status');retry.type='button';retry.addEventListener('click',()=>load());host.replaceChildren(notice,retry);
      }finally{state.loading=false;}
    }
    function render(){
      host.replaceChildren();const poll=state.poll;if(!poll)return;
      const results=poll.closed||(poll.hasVoted&&!state.editing),form=node('form','poll-form');form.dataset.view=results?'results':'choice';form.setAttribute('aria-busy',String(state.busy));
      const header=node('header','poll-heading');header.append(node('span','poll-kicker','アンケート'),node('span','poll-state',poll.closed?'受付終了':results?'投票済み':state.editing?'投票先を変更':'投票受付中'));
      const heading=node('h4','poll-question',poll.question);heading.id='poll-question-'+parent;form.setAttribute('aria-labelledby',heading.id);
      const options=node('div','poll-options');options.setAttribute('role','radiogroup');options.setAttribute('aria-labelledby',heading.id);
      const message=node('p','public-message',state.notice);message.setAttribute('role','status');
      const submit=node('button','btn poll-vote',state.busy?'投票しています…':state.editing?'投票先を変更する':'投票する');submit.type='submit';submit.hidden=results;
      const canSubmit=()=>!state.busy&&!poll.closed&&!results&&!!state.selected&&(!poll.hasVoted||state.selected!==poll.selectedOptionId);
      submit.disabled=!canSubmit();const radios=[];
      const highest=Math.max(...poll.options.map(option=>option.votes));
      for(const option of poll.options){
        const selected=results?poll.selectedOptionId===option.id:state.selected===option.id;
        const row=node('label','poll-option'+(selected?' is-selected':'')+(results&&highest>0&&option.votes===highest?' is-leading':''));
        const radio=node('input');radio.type='radio';radio.name='pollOption';radio.value=option.id;radio.checked=state.selected===option.id;radio.disabled=state.busy||results;
        const copy=node('span','poll-option-copy');copy.append(node('span','poll-option-text',option.label));
        if(option.imageUrl){const img=node('img','poll-option-image');img.src=API+option.imageUrl;img.alt=option.label;img.loading='lazy';copy.append(img);}
        const check=node('span','poll-option-check',selected?'✓':'');check.setAttribute('aria-hidden','true');row.append(radio,copy,check);
        if(results){
          const percent=node('span','poll-percent',option.percent.toLocaleString('ja-JP',{maximumFractionDigits:1})+'%');
          const bar=node('span','poll-bar'),fill=node('span');bar.setAttribute('aria-hidden','true');fill.style.width=option.percent+'%';bar.append(fill);row.append(percent,bar);
          if(selected)row.append(node('span','poll-sr-only','あなたの投票'));
        }
        radio.addEventListener('change',()=>{
          if(state.busy||results)return;state.selected=option.id;submit.disabled=!canSubmit();
          options.querySelectorAll('.poll-option').forEach(label=>{const active=label.querySelector('input').value===state.selected;label.classList.toggle('is-selected',active);label.querySelector('.poll-option-check').textContent=active?'✓':'';});
        });options.append(row);radios.push(radio);
      }
      const footer=node('div','poll-footer'),total=node('p','poll-total',count(poll.totalVotes)+'票');footer.append(total);
      const change=node('button','poll-change','投票先を変更');change.type='button';change.disabled=state.busy;change.hidden=!results||poll.closed;
      change.addEventListener('click',()=>{if(state.busy||poll.closed)return;state.editing=true;state.notice='';render();host.querySelector('input:checked')?.focus();});footer.append(change);
      if(state.editing){const cancel=node('button','poll-change poll-cancel','結果に戻る');cancel.type='button';cancel.disabled=state.busy;cancel.addEventListener('click',()=>{if(state.busy)return;state.editing=false;state.selected=poll.selectedOptionId;state.notice='';render();});footer.append(cancel);}
      const privacy=node('details','poll-privacy');privacy.append(node('summary','','投票について'),node('p','survey-note','このブラウザーの識別情報で1票にまとめます。投票先は選び直せます。保存情報の削除・期限切れや別のブラウザーによる重複は完全には防げません。'));
      form.append(header,heading,options,submit,message,footer,privacy);
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(!canSubmit())return;
        state.busy=true;listMutationEpoch++;radios.forEach(radio=>radio.disabled=true);submit.disabled=true;submit.textContent='投票しています…';change.disabled=true;form.querySelector('.poll-cancel')?.setAttribute('disabled','');form.setAttribute('aria-busy','true');state.notice='投票しています…';say(message,state.notice);
        let success=false;
        try{
          const token=await pollIdentity(),payload=requestPayload(state,{optionId:state.selected,voterToken:token});
          const data=await api('/ideas/'+parent+'/poll/vote',encodeAction(payload)),next=validPoll(data.poll);if(!next)throw Error('投票結果を確認できません。同じ内容で再試行してください。');
          state.poll=next;state.selected=next.selectedOptionId||state.selected;state.payload=null;state.fingerprint=null;state.editing=false;state.notice='投票しました。';success=true;
        }catch(error){
          if(error.status===403){if(!state.payload||pollToken===state.payload.voterToken)forgetPollIdentity();state.payload=null;state.fingerprint=null;}
          if(error.status===409){state.loaded=false;await load(true);}
          state.notice=error.message;
        }finally{
          state.busy=false;render();if(success)host.querySelector('.poll-change:not([hidden])')?.focus();
        }
      });host.append(form);
    }
    return {host,load};
  }
  // One poll view per idea, retained when sorting or opening the discussion.
  const pollViews=new Map();
  function pollFor(id){if(!pollViews.has(id)){const host=node('section','idea-poll poll-card');host.setAttribute('aria-label','アンケート');pollViews.set(id,publicPoll(id,host));}return pollViews.get(id);}
  const pollObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;pollObserver.unobserve(entry.target);pollFor(entry.target.dataset.ideaId).load();}},{rootMargin:'300px 0px'}):null;

  const detailCache=new Map();
  function updateDetail(item) {
    const row=ideaList.querySelector('[data-idea-id="'+item.id+'"] .idea-select');
    if(row){row.querySelector('.idea-summary-meta').textContent='応援 '+count(item.votes)+' · コメント '+count(item.commentCount);row.querySelector('.idea-status').textContent=statuses[item.status];}
    const entry=detailCache.get(item.id);if(!entry)return;
    entry.title.textContent=item.title;entry.body.textContent=item.body;entry.status.textContent=statuses[item.status];entry.meta.textContent='公開コメント '+count(item.commentCount)+'件';entry.vote.textContent=(votes.get(item.id)?.done?'応援済み':'応援する');entry.commentCountLabel.textContent='公開コメント '+count(item.commentCount)+'件';
  }
  function detailFor(item) {
    if(detailCache.has(item.id)){updateDetail(item);return detailCache.get(item.id);}
    const panel=node('div','idea-detail-content');panel.dataset.parentId=item.id;panel.id='idea-detail-'+item.id;
    const status=node('span','idea-status',statuses[item.status]),meta=node('p','survey-note','公開コメント '+count(item.commentCount)+'件'),title=node('h3','',item.title),body=node('p','idea-body',item.body);
    panel.append(status,meta,title,body,voteControls(item));
    const fileArea=node('section','idea-files'),fileNotice=node('p','public-message');fileNotice.setAttribute('role','status');fileArea.append(node('h4','','公開された添付'),fileNotice);panel.append(fileArea);let fileRows=[];
    async function loadFiles(){try{const data=await api('/ideas/'+item.id+'/files');fileRows=checkedFiles(data.items);renderFileLinks(fileArea,fileRows.filter(f=>!f.commentId));say(fileNotice,fileRows.length?'':'公開された添付はありません。');}catch(error){say(fileNotice,error.message);} }
    const details=node('section','idea-comments'),summary=node('h4','','コメント · 具体的な使い方'),list=node('div'),notice=node('p','public-message'),reload=node('button','public-refresh','コメントを読み直す'),more=node('button','public-refresh','さらに見る');
    notice.setAttribute('role','status');reload.type='button';more.type='button';more.hidden=true;
    const compose=node('details','idea-comment-compose'),composeSummary=node('summary','','コメントを書く');compose.append(composeSummary,commentForm(item.id,async data=>{const current=loadedIdeas.get(item.id)||item;if(number(data.commentCount)){current.commentCount=data.commentCount;updateDetail(current);}await load(0,true);}));details.append(summary,list,notice,reload,more,compose);panel.append(details);
    let loaded=false,busy=false,nextOffset=null,loadChain=Promise.resolve();
    function load(offset=0,force=false){if(force){const job=loadChain.then(()=>runLoad(offset));loadChain=job.catch(()=>{});return job;}if(busy)return Promise.resolve();const job=runLoad(offset);loadChain=job.catch(()=>{});return job;}
    async function runLoad(offset=0) {
      if(busy)return;busy=true;reload.disabled=true;more.disabled=true;say(notice,'コメントを読み込んでいます…');
      try {
        await loadFiles();
        const data=validateItems(await api('/ideas/'+item.id+'/comments?offset='+offset),true),fragment=document.createDocumentFragment();
        for(const comment of data.items) {
          const row=node('div','comment-item'),date=node('time','',comment.createdAt.slice(0,10));date.dateTime=comment.createdAt;
          row.append(date,node('p','comment-body',comment.body));row.dataset.commentId=comment.id;renderFileLinks(row,fileRows.filter(f=>f.commentId===comment.id));fragment.append(row);
        }
        if(offset===0)list.replaceChildren(fragment);else list.append(fragment);
        loaded=true;nextOffset=data.nextOffset;more.hidden=nextOffset===null;say(notice,list.children.length?'':'公開されたコメントはまだありません。');
      }catch(error){say(notice,error.message);}finally{busy=false;reload.disabled=false;more.disabled=false;}
    }
    reload.addEventListener('click',()=>load());more.addEventListener('click',()=>{if(nextOffset!==null)load(nextOffset);});
    const entry={panel,status,meta,title,body,vote:panel.querySelector('.idea-vote-controls button'),commentCountLabel:panel.querySelector('.idea-actions .survey-note'),loadOnce(){if(!loaded)load();pollFor(item.id).load();}};detailCache.set(item.id,entry);return entry;
  }
  const ideaList=document.querySelector('#idea-list'),ideaNotice=document.querySelector('#ideas-message'),ideaMore=document.querySelector('#ideas-more'),detailHost=document.querySelector('#idea-detail'),sortButtons=[...document.querySelectorAll('[data-idea-sort]')];
  let ideasBusy=false,nextOffset=null,selectedId=null,loadedIdeas=new Map(),currentSort='newest',desiredSort='newest',listMutationEpoch=0;
  function mutationBusy() {return [...votes.values(),...commentStates.values(),...pollStates.values()].some(state=>state.busy);}
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
    ideasBusy=true;const ownEpoch=listMutationEpoch;ideaMore.disabled=true;sortButtons.forEach(button=>button.disabled=true);
    try {
      const data=validateItems(await api('/ideas?sort='+sort+'&offset='+offset)),fragment=document.createDocumentFragment();
      // A vote/comment may have started while this GET was in flight. Preserve its form and status.
      if(mutationBusy()||ownEpoch!==listMutationEpoch){say(ideaNotice,'送信後の一覧を確認しています。');return;}
      if(offset===0)loadedIdeas=new Map();
      for(const item of data.items){loadedIdeas.set(item.id,item);fragment.append(card(item));}
      if(offset===0)ideaList.replaceChildren(fragment);else ideaList.append(fragment);
      currentSort=sort;desiredSort=sort;sortButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaSort===currentSort)));
      if(selectedId&&loadedIdeas.has(selectedId)){const entry=detailFor(loadedIdeas.get(selectedId));ideaList.querySelector('[data-idea-id="'+selectedId+'"]').append(entry.panel);ideaList.querySelectorAll('.idea-select').forEach(button=>{const active=button.dataset.selectIdea===selectedId;button.setAttribute('aria-expanded',String(active));button.setAttribute('aria-pressed',String(active));button.closest('.idea-card').classList.toggle('is-selected',active);});}
      else {selectedId=null;detailHost.replaceChildren();}
      nextOffset=data.nextOffset;ideaMore.hidden=nextOffset===null;say(ideaNotice,ideaList.children.length?'':'作者が掲載した案はまだありません。新しい要望はお問い合わせからお送りください。');
    }catch(error){say(ideaNotice,(ideaList.children.length?'前回取得した一覧を表示しています。 ':'')+error.message);}
    finally{ideasBusy=false;ideaMore.disabled=false;sortButtons.forEach(button=>button.disabled=false);}
  }
  sortButtons.forEach(button=>button.addEventListener('click',()=>{if(button.dataset.ideaSort!==currentSort){desiredSort=button.dataset.ideaSort;loadIdeas(0,desiredSort);}}));
ideaMore.addEventListener('click',()=>{if(nextOffset!==null)loadIdeas(nextOffset,currentSort);});
  loadIdeas();
})();
