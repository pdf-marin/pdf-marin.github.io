// English website runtime. Keep request field names, limits and retry identifiers aligned with site.js.
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
    menu.setAttribute('aria-label', 'Open menu');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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

  // This English homepage uses illustrated still images; no video is loaded.

  if (!/Windows/.test(navigator.userAgent) || /Windows Phone/.test(navigator.userAgent)) $('#pcnote').hidden = false;
  $('#copylink').addEventListener('click', async () => {
    const url = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname) ? location.href : 'https://pdf-marin.github.io/en/';
    try {
      await navigator.clipboard.writeText(url);
      $('#copydone').hidden = false;
    } catch { window.prompt('Copy this link:', url); }
  });
  function validUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:'; } catch { return false; }
  }
  if (/^https?:$/.test(location.protocol)) {
    fetch('../version.json', {cache:'no-store'})
      .then(response => { if (!response.ok) throw new Error('Version information unavailable'); return response.json(); })
      .then(version => {
        if (validUrl(version.url)) $$('[data-download]').forEach(link => { link.href = version.url; });
        if (typeof version.version === 'string') $$('[data-version]').forEach(el => { el.textContent = 'v' + version.version; });
        if (typeof version.size === 'string') $$('[data-size]').forEach(el => { el.textContent = version.size.replace(/^約\s*/, 'Approx. '); });
        $$('[data-support-link]').forEach(link => { link.href = 'https://ko-fi.com/pdfmarin'; });
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
          $$('[data-store-status]').forEach(el => { el.textContent = 'Available'; });
          $$('[data-store-copy]').forEach(el => {
            el.textContent = 'Install PDF MARIN from Microsoft Store. The Store also manages app updates.';
          });
          $$('[data-web-download]').forEach(link => {
            link.classList.add('secondary');
            const label = $('span', link);
            if (label) label.textContent = 'Download for Windows';
          });
        }
      }).catch(() => { /* Keep the working download links already present in the HTML. */ });
  }

  const form = $('.feedback-form');
  const textarea = $('textarea', form);
  const counter = $('#character-count');
  textarea.addEventListener('input', () => {
    counter.textContent = textarea.value.length.toLocaleString('en-US') + ' / 4,000';
    textarea.setCustomValidity('');
  });
  form.addEventListener('invalid', event => {
    const field=event.target;
    if(field.validity.valueMissing)field.setCustomValidity('Enter a message.');
    else if(field.validity.typeMismatch&&field.type==='email')field.setCustomValidity('Enter a valid email address.');
  }, true);
  form.elements.contact.addEventListener('input',()=>form.elements.contact.setCustomValidity(''));
  const kind=form.elements.kind;
  const templates={want:'[Feature request]\n\n[When I would use it]\n\n[What it would help me do]\n',hard:'[What is difficult]\n\n[Current steps]\n\n[Expected behavior]\n'};
  const templateOnly=value=>Object.values(templates).some(template=>value.replace(/\s/g,'')===template.replace(/\s/g,''));
  let lastTemplate=null;
  kind.addEventListener('change',()=>{const template=templates[kind.value]||'';if(!textarea.value.trim()||textarea.value===lastTemplate||templateOnly(textarea.value)){textarea.value=template;lastTemplate=template||null;textarea.dispatchEvent(new Event('input',{bubbles:true}));}});
  // Keep the original multipart POST contract. Let the endpoint render its response.
  form.addEventListener('submit', event => {
    if (!textarea.value.trim()||templateOnly(textarea.value)) {
      event.preventDefault();
      textarea.setCustomValidity(templateOnly(textarea.value)?'Add your request below the headings.':'Enter a message.');
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
        name.textContent = file.name + ' (' + formatSize(file.size) + ')';
        const remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = 'Remove';
        remove.setAttribute('aria-label', file.name + ' — remove attachment');
        remove.addEventListener('click', () => {
          selected.splice(index, 1); announce('Attachment removed.'); sync();
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
      if (excess) messages.push('You can attach up to 8 files. ' + excess + ' file(s) could not be added.');
      if (duplicate) messages.push('Skipped ' + duplicate + ' duplicate file(s).');
      announce(messages.join(' ')); sync();
    }
    input.addEventListener('change', () => add(input.files));
    ['dragenter','dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('is-drag'); }));
    ['dragleave','drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('is-drag'); }));
    dropzone.addEventListener('drop', event => { if (event.dataTransfer?.files.length) add(event.dataTransfer.files); });
    form.addEventListener('reset', () => { selected = []; setTimeout(() => { sync(); counter.textContent = '0 / 4,000'; announce(''); }, 0); });
  } else {
    input.addEventListener('change', () => input.setCustomValidity(input.files.length > maximum ? 'Choose no more than 8 attachments.' : ''));
  }
})();

// Author-curated ideas and comments; anonymous poll identity uses browser storage.
(() => {
  const section=document.querySelector('#public-ideas');
  if(!section) return;
  const API='https://pdf-marin-backend.pdfmarin.workers.dev';
  const statuses={considering:'Considering',planned:'Planned',implemented:'Implemented'};
  const votes=new Map(),commentStates=new Map(),pollStates=new Map();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const number=value=>Number.isSafeInteger(value)&&value>=0;
  const count=value=>value.toLocaleString('en-US');
  const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const say=(el,text)=>{el.hidden=false;el.textContent=text;};
  const serverError=status=>({400:'Check your entries and try again.',403:'This request is not permitted. Reload the page and try again.',409:'This item has changed. Reload it and try again.',413:'The attachments are too large.',429:'Too many requests. Please wait before trying again.',503:'The service is temporarily unavailable. Please try again later.'}[status]||'The request could not be confirmed. You can try again.');
  const contentNode=(tag,className,text)=>{const el=node(tag,className,text);if(/[\u3040-\u30ff\u3400-\u9fff]/.test(text))el.lang='ja';return el;};
  async function api(path,payload,extraHeaders={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {
      const res=await fetch(API+path,{method:payload?'POST':'GET',headers:{...(payload&&!(payload instanceof FormData)?{'Content-Type':'application/json'}:{}),...extraHeaders},body:payload?(payload instanceof FormData?payload:JSON.stringify(payload)):undefined,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});
      const data=await res.json();
      if(!res.ok||data?.ok!==true){const error=Error(serverError(res.status));error.status=res.status;throw error;}
      return data;
    } catch(error) {
      if(error.name==='AbortError'||error instanceof TypeError) throw Error('The connection could not be confirmed. Try again with the same content.');
      if(error instanceof SyntaxError) throw Error('The service returned an unreadable response. Please try again.');
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
    const box=node('fieldset','public-attachments');box.append(node('legend','','Attachments (optional)'),node('p','survey-note','Attach up to 3 PNG, JPEG or PDF files: 5 MB per file and 10 MB in total. Each idea can have up to 150 attachments, including comments. Remove personal and confidential information first. Uploads depend on available storage.'));
    const label=node('label','','Choose files'),input=node('input');input.type='file';input.name='files';input.multiple=true;input.accept='image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf';label.append(input);
    const list=node('ul','filelist');list.dataset.selectedFiles='';const consent=node('label','public-consent'),check=node('input');check.type='checkbox';check.name='attachmentPublicConsent';consent.append(check,document.createTextNode('Allow these attachments to be published'));
    const message=node('p','public-message');message.dataset.fileMessage='';message.setAttribute('role','status');box.append(label,list,consent,node('p','survey-note','If unchecked, only the developer can view the attachments. If checked, each attachment still needs the developer’s approval before publication.'),message);return box;
  }
  function attachmentControl(form,state) {
    const input=form.elements.files,consent=form.elements.attachmentPublicConsent,list=form.querySelector('[data-selected-files]'),message=form.querySelector('[data-file-message]');
    if(!input)return {files:()=>[],consent:()=>false,lock(){}};
    state.files=state.files||[];if(state.payload)consent.checked=state.payload.attachmentPublicConsent===true;
    function redraw(){list.replaceChildren();state.files.forEach((file,i)=>{const row=node('li'),remove=node('button','','Remove');remove.type='button';remove.disabled=!!state.busy||!!state.done;row.append(node('span','',file.name+' ('+(file.size/1048576).toFixed(1)+' MB)'),remove);remove.addEventListener('click',()=>{if(state.busy||state.done)return;state.files.splice(i,1);state.payload=null;redraw();});list.append(row);});}
    input.addEventListener('change',()=>{
      if(state.busy||state.done){input.value='';return;}
      const files=[...input.files],merged=state.files.slice();let error='';
      for(const file of files){if(!['image/png','image/jpeg','application/pdf'].includes(file.type)){error='Choose PNG, JPEG or PDF files.';break;}if(file.size===0||file.size>5*1048576){error='Each attachment must be nonempty and no larger than 5 MB.';break;}if(merged.length>=3||merged.reduce((n,f)=>n+f.size,0)+file.size>10*1048576){error='Attach up to 3 files, no more than 10 MB in total.';break;}merged.push(file);}
      input.value='';if(error){say(message,error);return;}state.files=merged;state.payload=null;say(message,'');redraw();
    });
    consent.addEventListener('change',()=>{if(!state.busy&&!state.done)state.payload=null;});redraw();
    return {files:()=>state.files.slice(),consent:()=>consent.checked,reset(){state.files=[];consent.checked=false;input.value='';redraw();},lock(value){input.disabled=value;consent.disabled=value;list.querySelectorAll('button').forEach(b=>b.disabled=value);}};
  }
  function checkedFiles(items) {
    if(!Array.isArray(items)||items.length>150)throw Error('The attachment list could not be verified.');
    for(const f of items){if(!uuid.test(f.id)||typeof f.name!=='string'||!number(f.size)||!['image/png','image/jpeg','application/pdf'].includes(f.mime)||f.url!=='/files/'+f.id+'/content'||(f.commentId!==null&&!uuid.test(f.commentId)))throw Error('The attachment list could not be verified.');}return items;
  }
  function renderFileLinks(parent,files) {
    parent.querySelector(':scope > .published-files')?.remove();if(!files.length)return;
    const list=node('ul','published-files');for(const file of files){const row=node('li'),link=node('a','',file.name+' ('+(file.size/1048576).toFixed(1)+' MB)');link.href=API+file.url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';row.append(link);list.append(row);}parent.append(list);
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
      state.busy=true;listMutationEpoch++;button.disabled=true;attachments.lock(true);if(state.repeatable)form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=true;});form.setAttribute('aria-busy','true');say(message,'Sending…');
      try {
        const data=await api(path,encodeAction(requestPayload(state,payload)));
        state.done=true;
        form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=true;});
        say(message,'Comment submitted. Check the list for its publication status.');await onSuccess?.(data);if(state.repeatable){state.done=false;state.payload=null;state.fingerprint=null;form.reset();attachments.reset();form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=false;});}
      } catch(error) {say(message,error.message);}
      finally {state.busy=false;if(state.repeatable&&!state.done)form.querySelectorAll('input,textarea').forEach(el=>{el.disabled=false;});attachments.lock(!!state.done);button.disabled=!!state.done;form.removeAttribute('aria-busy');}
    });
  }
  function validateItems(data,comments=false) {
    if(!Array.isArray(data.items)||data.items.length>50||(data.nextOffset!==null&&(!number(data.nextOffset)||data.nextOffset>1000000))) throw Error('The list could not be verified.');
    for(const item of data.items) {
      if(!uuid.test(item.id)||typeof item.body!=='string'||typeof item.createdAt!=='string')throw Error('The list could not be verified.');
      if(!comments&&(typeof item.title!=='string'||!Object.hasOwn(statuses,item.status)||!number(item.votes)||!number(item.commentCount)))throw Error('The list could not be verified.');
    }
    return data;
  }
  function commentForm(ideaId,onSent) {
    const form=node('form','public-comment-form'),label=node('label','','Comment (up to 600 characters)'),textarea=node('textarea');
    const heading=node('h4','','How would this help you?'),help=node('p','survey-note','Describe when you would use this and how you would like it to work. The developer also receives an email notification when you submit a comment.');
    textarea.name='body';textarea.required=true;textarea.maxLength=600;textarea.rows=3;label.append(textarea);
    const publicNotice=node('p','survey-note',"Text-only comments are checked automatically and published without a displayed name if accepted. Comments with attachments are reviewed before the text is published. Attachments are published only with your separate permission and the developer’s individual approval. We use comments to discuss improvements, moderate posts and prevent abuse. Do not include personal information.");
    const policyLink=node('a','',"Privacy Policy (Japanese original)");policyLink.href='../privacy.html';publicNotice.append(document.createTextNode(' '),policyLink);
    const trap=node('div','hp');trap.setAttribute('aria-hidden','true');const trapInput=node('input');trapInput.name='website';trapInput.type='text';trapInput.tabIndex=-1;trapInput.autocomplete='off';trap.append(trapInput);
    const message=node('p','public-message');message.setAttribute('role','status');const submit=node('button','btn','Send');submit.type='submit';
    form.append(heading,help,label,makeAttachmentFields(),trap,message,publicNotice,submit);
    let state=commentStates.get(ideaId);if(!state){state={};commentStates.set(ideaId,state);}
    state.repeatable=true;
    wireForm(form,'/ideas/'+ideaId+'/comments',()=>{
      const body=textarea.value.trim();if(!body||textarea.value.length>600){say(message,'Enter a comment of up to 600 characters.');return null;}
      return {body,publicConsent:true,website:trapInput.value};
    },onSent,state);
    if(state.payload){textarea.value=state.payload.body;}
    if(state.done){textarea.disabled=true;say(message,'Your comment has been submitted.');}
    return form;
  }
  function voteControls(item) {
    const actions=node('div','idea-actions'),vote=node('button','','Support this idea'),message=node('p','public-message');message.setAttribute('role','status');vote.type='button';
    let state=votes.get(item.id);if(!state){state={};votes.set(item.id,state);}
    vote.disabled=!!state.busy||!!state.done||!crypto.randomUUID;
    if(state.done)vote.textContent='Supported';
    vote.addEventListener('click',async()=>{
      if(state.busy||state.done)return;state.busy=true;listMutationEpoch++;vote.disabled=true;say(message,'Sending…');
      try {
        const data=await api('/ideas/'+item.id+'/vote',requestPayload(state,{}));
        state.done=true;
        if(number(data.votes)) {vote.textContent='Supported';const current=loadedIdeas.get(item.id)||item;current.votes=data.votes;updateDetail(current);}
        else vote.textContent='Supported';
        say(message,'Support recorded.');
      }catch(error){say(message,error.message);}finally{state.busy=false;vote.disabled=!!state.done;}
    });
    actions.append(vote,node('span','survey-note','Public comments: '+count(item.commentCount)+''));const box=node('div','idea-vote-controls');const purpose=node('p','survey-note',"Support is recorded to help prioritize improvements and prevent duplicate submissions. ");const policy=node('a','',"Privacy Policy (Japanese original)");policy.href='../privacy.html';purpose.append(policy);box.append(actions,message,purpose);return box;
  }
  function card(item) {
    const article=node('article','idea-card');article.dataset.ideaId=item.id;
    const choose=node('button','idea-select');choose.type='button';choose.dataset.selectIdea=item.id;choose.setAttribute('aria-controls','idea-detail-'+item.id);choose.setAttribute('aria-expanded',String(selectedId===item.id));choose.setAttribute('aria-pressed',String(selectedId===item.id));
    const topic=node('span','idea-topic');topic.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');svg.setAttribute('class','icon');use.setAttribute('href','#i-spark');svg.append(use);topic.append(svg);
    const titleBlock=node('span','idea-title-block');titleBlock.append(contentNode('strong','idea-title',item.title),node('span','idea-summary-meta','Support: '+count(item.votes)+' · Comments: '+count(item.commentCount)));
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
  async function pollIdentity(){if(pollToken)return pollToken;if(!identityPromise)identityPromise=api('/polls/identity',{}).then(data=>{if(typeof data.voterToken!=='string'||!data.voterToken||data.voterToken.length>4096)throw Error('Voting could not be prepared. Please try again.');pollToken=data.voterToken;try{localStorage.setItem(pollTokenKey,pollToken);}catch{}return pollToken;}).finally(()=>identityPromise=null);return identityPromise;}
  function validPoll(poll){
    if(poll===null)return null;
    if(!poll||!uuid.test(poll.id)||typeof poll.question!=='string'||poll.question.length>120||!Array.isArray(poll.options)||poll.options.length<2||poll.options.length>6||!number(poll.totalVotes)||typeof poll.closed!=='boolean')throw Error('The poll could not be verified.');
    const ids=new Set();for(const option of poll.options){if(!uuid.test(option.id)||ids.has(option.id)||typeof option.label!=='string'||option.label.length>80||!number(option.votes)||!Number.isFinite(option.percent)||option.percent<0||option.percent>100)throw Error('The poll could not be verified.');ids.add(option.id);if(option.imageUrl&&(option.imageFileId===null||!uuid.test(option.imageFileId)||option.imageUrl!=='/files/'+option.imageFileId+'/content'))throw Error('The poll image could not be verified.');}
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
        const notice=node('p','public-message',error.message),retry=node('button','public-refresh poll-retry','Reload poll');notice.setAttribute('role','status');retry.type='button';retry.addEventListener('click',()=>load());host.replaceChildren(notice,retry);
      }finally{state.loading=false;}
    }
    function render(){
      host.replaceChildren();const poll=state.poll;if(!poll)return;
      const results=poll.closed||(poll.hasVoted&&!state.editing),form=node('form','poll-form');form.dataset.view=results?'results':'choice';form.setAttribute('aria-busy',String(state.busy));
      const header=node('header','poll-heading');header.append(node('span','poll-kicker','Poll'),node('span','poll-state',poll.closed?'Closed':results?'Voted':state.editing?'Change vote':'Open for voting'));
      const heading=contentNode('h4','poll-question',poll.question);heading.id='poll-question-'+parent;form.setAttribute('aria-labelledby',heading.id);
      const options=node('div','poll-options');options.setAttribute('role','radiogroup');options.setAttribute('aria-labelledby',heading.id);
      const message=node('p','public-message',state.notice);message.setAttribute('role','status');
      const submit=node('button','btn poll-vote',state.busy?'Submitting vote…':state.editing?'Change vote':'Vote');submit.type='submit';submit.hidden=results;
      const canSubmit=()=>!state.busy&&!poll.closed&&!results&&!!state.selected&&(!poll.hasVoted||state.selected!==poll.selectedOptionId);
      submit.disabled=!canSubmit();const radios=[];
      const highest=Math.max(...poll.options.map(option=>option.votes));
      for(const option of poll.options){
        const selected=results?poll.selectedOptionId===option.id:state.selected===option.id;
        const row=node('label','poll-option'+(selected?' is-selected':'')+(results&&highest>0&&option.votes===highest?' is-leading':''));
        const radio=node('input');radio.type='radio';radio.name='pollOption';radio.value=option.id;radio.checked=state.selected===option.id;radio.disabled=state.busy||results;
        const copy=node('span','poll-option-copy');copy.append(contentNode('span','poll-option-text',option.label));
        if(option.imageUrl){const img=node('img','poll-option-image');img.src=API+option.imageUrl;img.alt=option.label;img.loading='lazy';copy.append(img);}
        const check=node('span','poll-option-check',selected?'✓':'');check.setAttribute('aria-hidden','true');row.append(radio,copy,check);
        if(results){
          const percent=node('span','poll-percent',option.percent.toLocaleString('en-US',{maximumFractionDigits:1})+'%');
          const bar=node('span','poll-bar'),fill=node('span');bar.setAttribute('aria-hidden','true');fill.style.width=option.percent+'%';bar.append(fill);row.append(percent,bar);
          if(selected)row.append(node('span','poll-sr-only','Your vote'));
        }
        radio.addEventListener('change',()=>{
          if(state.busy||results)return;state.selected=option.id;submit.disabled=!canSubmit();
          options.querySelectorAll('.poll-option').forEach(label=>{const active=label.querySelector('input').value===state.selected;label.classList.toggle('is-selected',active);label.querySelector('.poll-option-check').textContent=active?'✓':'';});
        });options.append(row);radios.push(radio);
      }
      const footer=node('div','poll-footer'),total=node('p','poll-total',count(poll.totalVotes)+' votes');footer.append(total);
      const change=node('button','poll-change','Change vote');change.type='button';change.disabled=state.busy;change.hidden=!results||poll.closed;
      change.addEventListener('click',()=>{if(state.busy||poll.closed)return;state.editing=true;state.notice='';render();host.querySelector('input:checked')?.focus();});footer.append(change);
      if(state.editing){const cancel=node('button','poll-change poll-cancel','Back to results');cancel.type='button';cancel.disabled=state.busy;cancel.addEventListener('click',()=>{if(state.busy)return;state.editing=false;state.selected=poll.selectedOptionId;state.notice='';render();});footer.append(cancel);}
      const privacy=node('details','poll-privacy');privacy.append(node('summary','','About voting'),node('p','survey-note','A browser identifier keeps your selection to one vote. You can change your choice. Duplicate votes cannot be fully prevented if stored information is deleted, expires or another browser is used.'));
      const votePurpose=node('p','survey-note',"Responses are used for aggregation and duplicate-vote prevention. Results are public. ");const votePolicy=node('a','',"Privacy Policy (Japanese original)");votePolicy.href='../privacy.html';votePurpose.append(votePolicy);
      form.append(header,heading,options,votePurpose,submit,message,footer,privacy);
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(!canSubmit())return;
        state.busy=true;listMutationEpoch++;radios.forEach(radio=>radio.disabled=true);submit.disabled=true;submit.textContent='Submitting vote…';change.disabled=true;form.querySelector('.poll-cancel')?.setAttribute('disabled','');form.setAttribute('aria-busy','true');state.notice='Submitting vote…';say(message,state.notice);
        let success=false;
        try{
          const token=await pollIdentity(),payload=requestPayload(state,{optionId:state.selected,voterToken:token});
          const data=await api('/ideas/'+parent+'/poll/vote',encodeAction(payload)),next=validPoll(data.poll);if(!next)throw Error('The vote result could not be confirmed. Try again with the same selection.');
          state.poll=next;state.selected=next.selectedOptionId||state.selected;state.payload=null;state.fingerprint=null;state.editing=false;state.notice='Vote submitted.';success=true;
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
  function pollFor(id){if(!pollViews.has(id)){const host=node('section','idea-poll poll-card');host.setAttribute('aria-label','Poll');pollViews.set(id,publicPoll(id,host));}return pollViews.get(id);}
  const pollObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;pollObserver.unobserve(entry.target);pollFor(entry.target.dataset.ideaId).load();}},{rootMargin:'300px 0px'}):null;

  const detailCache=new Map();
  function updateDetail(item) {
    const row=ideaList.querySelector('[data-idea-id="'+item.id+'"] .idea-select');
    if(row){row.querySelector('.idea-summary-meta').textContent='Support: '+count(item.votes)+' · Comments: '+count(item.commentCount);row.querySelector('.idea-status').textContent=statuses[item.status];}
    const entry=detailCache.get(item.id);if(!entry)return;
    entry.title.textContent=item.title;entry.title.lang=/[\u3040-\u30ff\u3400-\u9fff]/.test(item.title)?'ja':'en';entry.body.textContent=item.body;entry.body.lang=/[\u3040-\u30ff\u3400-\u9fff]/.test(item.body)?'ja':'en';entry.status.textContent=statuses[item.status];entry.meta.textContent='Public comments: '+count(item.commentCount)+'';entry.vote.textContent=(votes.get(item.id)?.done?'Supported':'Support this idea');entry.commentCountLabel.textContent='Public comments: '+count(item.commentCount)+'';
  }
  function detailFor(item) {
    if(detailCache.has(item.id)){updateDetail(item);return detailCache.get(item.id);}
    const panel=node('div','idea-detail-content');panel.dataset.parentId=item.id;panel.id='idea-detail-'+item.id;
    const status=node('span','idea-status',statuses[item.status]),meta=node('p','survey-note','Public comments: '+count(item.commentCount)+''),title=contentNode('h3','',item.title),body=contentNode('p','idea-body',item.body);
    panel.append(status,meta,title,body,voteControls(item));
    const fileArea=node('section','idea-files'),fileNotice=node('p','public-message');fileNotice.setAttribute('role','status');fileArea.append(node('h4','','Published attachments'),fileNotice);panel.append(fileArea);let fileRows=[];
    async function loadFiles(){try{const data=await api('/ideas/'+item.id+'/files');fileRows=checkedFiles(data.items);renderFileLinks(fileArea,fileRows.filter(f=>!f.commentId));say(fileNotice,fileRows.length?'':'No published attachments.');}catch(error){say(fileNotice,error.message);} }
    const details=node('section','idea-comments'),summary=node('h4','','Comments and use cases'),list=node('div'),notice=node('p','public-message'),reload=node('button','public-refresh','Reload comments'),more=node('button','public-refresh','Show more');
    notice.setAttribute('role','status');reload.type='button';more.type='button';more.hidden=true;
    const compose=node('details','idea-comment-compose'),composeSummary=node('summary','','Write a comment');compose.append(composeSummary,commentForm(item.id,async data=>{const current=loadedIdeas.get(item.id)||item;if(number(data.commentCount)){current.commentCount=data.commentCount;updateDetail(current);}await load(0,true);}));details.append(summary,list,notice,reload,more,compose);panel.append(details);
    let loaded=false,busy=false,nextOffset=null,loadChain=Promise.resolve();
    function load(offset=0,force=false){if(force){const job=loadChain.then(()=>runLoad(offset));loadChain=job.catch(()=>{});return job;}if(busy)return Promise.resolve();const job=runLoad(offset);loadChain=job.catch(()=>{});return job;}
    async function runLoad(offset=0) {
      if(busy)return;busy=true;reload.disabled=true;more.disabled=true;say(notice,'Loading comments…');
      try {
        await loadFiles();
        const data=validateItems(await api('/ideas/'+item.id+'/comments?offset='+offset),true),fragment=document.createDocumentFragment();
        for(const comment of data.items) {
          const row=node('div','comment-item'),date=node('time','',comment.createdAt.slice(0,10));date.dateTime=comment.createdAt;
          row.append(date,contentNode('p','comment-body',comment.body));row.dataset.commentId=comment.id;renderFileLinks(row,fileRows.filter(f=>f.commentId===comment.id));fragment.append(row);
        }
        if(offset===0)list.replaceChildren(fragment);else list.append(fragment);
        loaded=true;nextOffset=data.nextOffset;more.hidden=nextOffset===null;say(notice,list.children.length?'':'No published comments yet.');
      }catch(error){say(notice,error.message);}finally{busy=false;reload.disabled=false;more.disabled=false;}
    }
    reload.addEventListener('click',()=>load());more.addEventListener('click',()=>{if(nextOffset!==null)load(nextOffset);});
    const entry={panel,status,meta,title,body,vote:panel.querySelector('.idea-vote-controls button'),commentCountLabel:panel.querySelector('.idea-actions .survey-note'),loadOnce(){if(!loaded)load();pollFor(item.id).load();}};detailCache.set(item.id,entry);return entry;
  }
  const ideaList=document.querySelector('#idea-list'),ideaNotice=document.querySelector('#ideas-message'),ideaMore=document.querySelector('#ideas-more'),detailHost=document.querySelector('#idea-detail'),sortButtons=[...document.querySelectorAll('[data-idea-sort]')];
  let ideasBusy=false,nextOffset=null,selectedId=null,loadedIdeas=new Map(),currentSort='newest',desiredSort='newest',listMutationEpoch=0;
  function mutationBusy() {return [...votes.values(),...commentStates.values(),...pollStates.values()].some(state=>state.busy);}
  function selectIdea(id) {
    if(mutationBusy()){say(ideaNotice,'Sending. You can select another idea when this finishes.');return;}
    const item=loadedIdeas.get(id);if(!item)return;
    if(id===selectedId){selectedId=null;ideaList.querySelectorAll('.idea-detail-content').forEach(panel=>panel.remove());ideaList.querySelectorAll('.idea-select').forEach(b=>{b.setAttribute('aria-expanded','false');b.setAttribute('aria-pressed','false');b.closest('.idea-card').classList.remove('is-selected');});say(ideaNotice,'');return;}
    selectedId=id;const entry=detailFor(item);ideaList.querySelectorAll('.idea-detail-content').forEach(panel=>panel.remove());ideaList.querySelector('[data-idea-id="'+id+'"]').append(entry.panel);entry.loadOnce();
    ideaList.querySelectorAll('.idea-select').forEach(button=>{const active=button.dataset.selectIdea===id;button.setAttribute('aria-expanded',String(active));button.setAttribute('aria-pressed',String(active));button.closest('.idea-card').classList.toggle('is-selected',active);});
    say(ideaNotice,'');
  }
  async function loadIdeas(offset=0,sort=currentSort) {
    if(ideasBusy)return;
    if(mutationBusy()){say(ideaNotice,'Sending. You can reload the list when this finishes.');return;}
    ideasBusy=true;const ownEpoch=listMutationEpoch;ideaMore.disabled=true;sortButtons.forEach(button=>button.disabled=true);
    try {
      const data=validateItems(await api('/ideas?sort='+sort+'&offset='+offset)),fragment=document.createDocumentFragment();
      // A vote/comment may have started while this GET was in flight. Preserve its form and status.
      if(mutationBusy()||ownEpoch!==listMutationEpoch){say(ideaNotice,'Checking the list after submission…');return;}
      if(offset===0)loadedIdeas=new Map();
      for(const item of data.items){loadedIdeas.set(item.id,item);fragment.append(card(item));}
      if(offset===0)ideaList.replaceChildren(fragment);else ideaList.append(fragment);
      currentSort=sort;desiredSort=sort;sortButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaSort===currentSort)));
      if(selectedId&&loadedIdeas.has(selectedId)){const entry=detailFor(loadedIdeas.get(selectedId));ideaList.querySelector('[data-idea-id="'+selectedId+'"]').append(entry.panel);ideaList.querySelectorAll('.idea-select').forEach(button=>{const active=button.dataset.selectIdea===selectedId;button.setAttribute('aria-expanded',String(active));button.setAttribute('aria-pressed',String(active));button.closest('.idea-card').classList.toggle('is-selected',active);});}
      else {selectedId=null;detailHost.replaceChildren();}
      nextOffset=data.nextOffset;ideaMore.hidden=nextOffset===null;say(ideaNotice,ideaList.children.length?'':'No ideas have been published by the developer yet. Send a request using the contact form.');
    }catch(error){say(ideaNotice,(ideaList.children.length?'Showing the previously loaded list. ':'')+error.message);}
    finally{ideasBusy=false;ideaMore.disabled=false;sortButtons.forEach(button=>button.disabled=false);}
  }
  sortButtons.forEach(button=>button.addEventListener('click',()=>{if(button.dataset.ideaSort!==currentSort){desiredSort=button.dataset.ideaSort;loadIdeas(0,desiredSort);}}));
ideaMore.addEventListener('click',()=>{if(nextOffset!==null)loadIdeas(nextOffset,currentSort);});
  loadIdeas();
})();
