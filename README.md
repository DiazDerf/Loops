# 📂 Loops - AI Study Companion 🚀

Loops is a high-performance, browser-based AI tool that helps students and professionals transform complex documents into structured study materials. By leveraging the Groq Llama 3.1 engine, Loops creates comprehensive reviewers and interactive quizzes in seconds.

# Live App https://loops-reviewer.vercel.app/

# ✨ Key Features

📄 Multi-Format Support: Upload .pdf, .docx, or .pptx files seamlessly.

🧠 AI Reviewer: Automatically generates a well-structured study guide using Markdown.

📝 Smart Quiz: Generates exactly 15 multiple-choice questions based on your document with instant scoring.

💬 Study Assistant: A persistent AI sidebar that allows you to chat with your document and clarify difficult concepts.

⚡ High-Speed AI: Powered by Groq's llama-3.1-8b-instant for near-instant responses.

🎨 Modern UI: Built with Tailwind CSS for a clean, responsive, and distraction-free experience.

🛠️ Tech Stack

Core: Vanilla JavaScript (ES6+), HTML5, CSS3

Styling: Tailwind CSS

AI Engine: Groq Cloud API

Libraries:

pdf.js (PDF parsing)

mammoth.js (Word document parsing)

jszip (PowerPoint parsing)

marked.js (Markdown rendering)

Phosphor Icons (UI iconography)

# 🚀 Getting Started
1. Prerequisites

You will need a Groq API Key. You can get one for free at: console.groq.com/keys.

# 2. Installation

Clone the repository:

code
Bash
download
content_copy
expand_less
git clone https://github.com/YOUR_USERNAME/loops-study-companion.git

Navigate to the project folder:

code
Bash
download
content_copy
expand_less
cd loops-study-companion

Open index.html in any modern web browser.

# 3. Usage

Click the Gear Icon ⚙️ in the top right to enter your Groq API Key.

Drag and drop your study file into the upload zone.

Wait for the processing to finish.

Use the tabs to switch between your Reviewer and Quiz.

Ask follow-up questions in the Sidebar Assistant.

# ⚙️ Configuration

The app uses llama-3.1-8b-instant by default to ensure you stay within the free tier rate limits. It includes an automatic 10-second cooldown between generation steps to respect Groq's "Tokens Per Minute" (TPM) limits.

# 📜 License

This project is open-source. Feel free to fork and modify!
