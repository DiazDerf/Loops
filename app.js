const GROQ_MODEL = "llama-3.1-8b-instant"; 
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const app = {
    apiKey: localStorage.getItem('groq_api_key') || '',
    extractedText: '',
    reviewerMarkdown: '',
    quizData: null,
    userAnswers: {},

    elements: {
        views: null, tabs: null, tabContents: null, closeModalBtns: null,
        dropZone: null, fileInput: null, settingsBtn: null, settingsModal: null,
        settingsModalContent: null, apiKeyInput: null, saveSettingsBtn: null,
        fileNameDisplay: null, reviewerTab: null, quizContainer: null,
        submitQuizBtn: null, quizResult: null, scoreDisplay: null, totalDisplay: null,
        chatMessages: null, chatInput: null, chatForm: null,
        processingTitle: null, processingDesc: null
    },

    init() {
        Object.keys(this.elements).forEach(key => {
            const el = document.getElementById(key);
            if (el) this.elements[key] = el;
        });
        this.elements.views = document.querySelectorAll('.view-section');
        this.elements.tabs = document.querySelectorAll('.tab-btn');
        this.elements.tabContents = document.querySelectorAll('.tab-content');
        this.elements.closeModalBtns = document.querySelectorAll('.modal-close');
        this.bindEvents();
        if (!this.apiKey) this.openSettings();
    },

    bindEvents() {
        this.elements.settingsBtn.onclick = () => this.openSettings();
        this.elements.closeModalBtns.forEach(btn => btn.onclick = () => this.closeSettings());
        this.elements.saveSettingsBtn.onclick = () => {
            const val = this.elements.apiKeyInput.value.trim();
            if (val) { this.apiKey = val; localStorage.setItem('groq_api_key', val); this.closeSettings(); }
        };
        this.elements.tabs.forEach(tab => {
            tab.onclick = () => {
                this.elements.tabs.forEach(t => t.classList.remove('active'));
                this.elements.tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            };
        });
        this.elements.chatForm.onsubmit = (e) => { e.preventDefault(); this.sendChatMessage(); };
        this.elements.submitQuizBtn.onclick = () => this.submitQuiz();
        const dp = this.elements.dropZone;
        if(dp) {
            ['dragenter', 'dragover'].forEach(e => dp.addEventListener(e, (ev) => ev.preventDefault()));
            dp.addEventListener('drop', (e) => { e.preventDefault(); this.handleFiles(e.dataTransfer.files); });
            dp.onclick = () => this.elements.fileInput.click();
        }
        if(this.elements.fileInput) this.elements.fileInput.onchange = (e) => this.handleFiles(e.target.files);
    },

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },

    async callGroq(p, sys = "You are an assistant.", temp = 0.3, retries = 3) {
        if (!this.apiKey) throw new Error("API Key missing.");
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
                body: JSON.stringify({ 
                    model: GROQ_MODEL, 
                    messages: [{role:"system", content:sys}, {role:"user", content:p}], 
                    temperature: temp
                })
            });

            if (res.status === 429 && retries > 0) {
                await this.sleep(5000);
                return this.callGroq(p, sys, temp, retries - 1);
            }

            const j = await res.json();
            if (j.error) throw new Error(j.error.message);
            return j.choices[0].message.content;
        } catch (e) {
            if (retries > 0) { await this.sleep(5000); return this.callGroq(p, sys, temp, retries - 1); }
            throw e;
        }
    },

    async handleFiles(files) {
        if (!files.length) return;
        this.elements.fileNameDisplay.textContent = files[0].name;
        this.switchView('processingView');
        try {
            const file = files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'pdf') this.extractedText = await this.extractPDF(file);
            else if (ext === 'pptx') this.extractedText = await this.extractPPTX(file);
            else this.extractedText = await this.extractDOCX(file);

            if (!this.extractedText.trim()) throw new Error("No text found.");

            // 1. Generate Reviewer
            this.elements.processingTitle.textContent = "Writing Reviewer...";
            this.reviewerMarkdown = await this.callGroq(`Create a study guide from:\n\n${this.extractedText.slice(0, 4000)}`, "Expert Tutor");
            
            // 2. Cooldown to avoid Rate Limits
            this.elements.processingTitle.textContent = "API Cooldown (10s)...";
            await this.sleep(10000); 

            // 3. Generate Quiz (Strictly exactly 15)
            this.elements.processingTitle.textContent = "Generating Quiz...";
            const q = await this.callGroq(`Generate exactly 15 multiple-choice questions based on the text. Return ONLY a JSON array: [{"question":"...","options":["A","B","C","D"],"answerIndex":0}]\n\nText: ${this.extractedText.slice(0, 4000)}`, "Quiz Generator");
            
            // Parse and FORCE exactly 15 items
            const parsedData = JSON.parse(q.replace(/```json|```/g, '').trim());
            this.quizData = parsedData.slice(0, 15);

            this.elements.reviewerTab.innerHTML = marked.parse(this.reviewerMarkdown);
            this.renderQuiz();
            this.switchView('resultsView');
        } catch (e) { alert("Error: " + e.message); this.resetView(); }
    },

    async extractPDF(f) {
        const doc = await pdfjsLib.getDocument(await f.arrayBuffer()).promise;
        let t = "";
        for (let i = 1; i <= Math.min(doc.numPages, 15); i++) {
            const p = await doc.getPage(i);
            const c = await p.getTextContent();
            t += c.items.map(s => s.str).join(" ") + "\n";
        }
        return t;
    },
    async extractDOCX(f) { return (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value; },
    async extractPPTX(f) {
        const zip = await JSZip.loadAsync(f);
        const slides = Object.keys(zip.files).filter(n => n.startsWith('ppt/slides/slide'));
        let t = "";
        for (const s of slides) {
            const xml = await zip.file(s).async("text");
            t += (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(m => m.replace(/<\/?a:t>/g, '')).join(" ") + "\n";
        }
        return t;
    },

    renderQuiz() {
        this.userAnswers = {};
        this.elements.quizResult.classList.add('hidden');
        this.elements.submitQuizBtn.classList.remove('hidden');
        this.elements.quizContainer.innerHTML = this.quizData.map((q, i) => `
            <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h4 class="font-bold mb-4">${i+1}. ${q.question}</h4>
                <div class="space-y-2">
                    ${q.options.map((o, oi) => `
                        <label class="quiz-option block p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-all">
                            <input type="radio" name="q${i}" class="hidden" onchange="app.selectAnswer(${i}, ${oi}, this.parentElement)">
                            ${o}
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    },
    selectAnswer(qi, oi, el) {
        this.userAnswers[qi] = oi;
        el.parentElement.querySelectorAll('.quiz-option').forEach(l => l.classList.remove('selected', 'border-brand-500', 'bg-brand-50'));
        el.classList.add('selected', 'border-brand-500', 'bg-brand-50');
    },
    submitQuiz() {
        if (Object.keys(this.userAnswers).length < this.quizData.length) return alert(`Please answer all 15 questions before submitting!`);
        let s = 0;
        this.quizData.forEach((q, i) => {
            const opts = this.elements.quizContainer.children[i].querySelectorAll('.quiz-option');
            opts.forEach((opt, oi) => {
                opt.style.pointerEvents = 'none';
                if (oi === q.answerIndex) opt.classList.add('correct');
                else if (oi === this.userAnswers[i]) opt.classList.add('incorrect');
            });
            if (this.userAnswers[i] === q.answerIndex) s++;
        });
        this.elements.scoreDisplay.textContent = s;
        this.elements.totalDisplay.textContent = this.quizData.length;
        this.elements.quizResult.classList.remove('hidden');
        this.elements.submitQuizBtn.classList.add('hidden');
    },
    async sendChatMessage() {
        const t = this.elements.chatInput.value.trim();
        if (!t) return;
        this.addMsg('user', t);
        this.elements.chatInput.value = '';
        const id = 'ai-' + Date.now();
        this.addMsg('ai', 'Thinking...', id);
        try {
            const r = await this.callGroq(t, `Use context: ${this.extractedText.slice(0, 3000)}`);
            const el = document.getElementById(id);
            if(el) el.textContent = r;
        } catch (e) { const el = document.getElementById(id); if (el) el.textContent = "Error: " + e.message; }
    },
    addMsg(role, text, id) {
        const d = document.createElement('div');
        d.className = role === 'user' ? 'message-user' : 'message-ai';
        if (id) d.id = id;
        d.textContent = text;
        if (this.elements.chatMessages) {
            this.elements.chatMessages.appendChild(d);
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    },
    switchView(id) {
        this.elements.views.forEach(v => v.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    },
    openSettings() { this.elements.settingsModal.classList.add('modal-open'); setTimeout(() => this.elements.settingsModalContent.classList.add('modal-open-content'), 10); },
    closeSettings() { this.elements.settingsModalContent.classList.remove('modal-open-content'); setTimeout(() => this.elements.settingsModal.classList.remove('modal-open'), 300); },
    retakeQuiz() { this.renderQuiz(); window.scrollTo({top: 0, behavior: 'smooth'}); },
    resetView() { location.reload(); }
};

document.addEventListener('DOMContentLoaded', () => app.init());