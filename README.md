# StudyMate AI - AI Study Assistant Advanced

> A complete, modern, framework-free web application designed for students and educators. Transforms class notes and topics into structured study summaries, interactive 5-question quizzes with instant scoring and explanations, and 3D animated active recall flashcards. Powered by Google's Gemini 2.5 Flash / 2.0 Flash API with intelligent multi-model fallback.

---

## 📌 Project Overview

**StudyMate AI (AI Study Assistant Advanced)** is built specifically for a university B.Tech/Diploma final year or mini-project demonstration. It solves the everyday student challenge of synthesizing dense academic material into active recall study tools (summaries, multiple-choice questions, and flashcards).

The entire application runs **100% on the client side** using **pure Vanilla HTML5, CSS3, and modern JavaScript (ES6+)**. It requires **zero build tools, zero npm packages, and zero server-side frameworks**.

---

## ✨ Features

1. **Intelligent Notes Processing**:
   - Accepts raw lecture notes, textbook chapters, or topic names.
   - Live character counter with warning alerts (up to 12,000 characters).
   - "Load Sample Notes" button for one-click testing of operating system concurrency concepts.
   - Style customization: *"Explain Like I Am 10"*, *"Exam-Focused"*, or *"Detailed"*.
   - Quiz difficulty customization: *Easy*, *Medium*, or *Hard*.

2. **Secure Gemini API Key Management**:
   - Collapsible settings drawer with input masking (`type="password"`).
   - Show / Hide toggle button.
   - Stores key in the browser's `localStorage` — never hardcoded into source code.
   - Visual key status badge showing whether an active key is configured (masked as `AIzaSy...xxxx`).

3. **Instant Demo / Offline Viva Mode**:
   - "Try Demo Mode" button allows you to test and demonstrate every feature (summary, quiz, flashcards, history) instantly without an API key or when offline during a college presentation.

4. **Study Summary Section**:
   - Nicely formatted academic summary matching the chosen style.
   - **Copy to Clipboard**: Uses the modern Clipboard API with fallback for older browsers.
   - **Download as .txt**: Instant file export using client-side `Blob` and synthetic link trigger.
   - **Read Aloud (Text-to-Speech)**: Uses the browser's native `SpeechSynthesis` Web API with Play / Stop controls.

5. **Interactive 5-Question Quiz**:
   - Exactly 5 multiple-choice questions with 4 selectable options each.
   - Real-time selection tracking.
   - Instant scoring banner showing score out of 5 and calculated percentage.
   - Highlights correct answers in green, student errors in red, and reveals detailed conceptual explanations for every question.
   - Anti-tampering protection: Disables options after submission.
   - "Try Again" and "Reset Selection" buttons.
   - Cumulative quiz attempt statistics stored in `localStorage`.

6. **3D Flip Flashcards (Active Recall)**:
   - Interactive 3D flip card with smooth CSS `perspective` and `rotateY(180deg)` animations.
   - Keyboard accessible: Flip with <kbd>Space</kbd> or <kbd>Enter</kbd>; navigate cards using <kbd>←</kbd> and <kbd>→</kbd> arrow keys.
   - "Know It" and "Review Again" buttons to classify mastery.
   - Dynamic mastery progress bar and counter (`Mastered: X / 5`).

7. **Study History & Session Persistence**:
   - Automatically saves successful study generations in `localStorage`.
   - Real-time search filter by topic or keyword.
   - One-click session restoration to reload summaries, quizzes, and cards.
   - Delete individual sessions or "Clear All History" with confirmation.
   - "Re-run Current Notes" button to generate fresh study material.

8. **Modern Light & Dark Theme**:
   - Light lavender/indigo theme designed for long study sessions.
   - Dark midnight slate theme for low-light environments.
   - Theme toggle button that persists user preference in `localStorage`.

9. **Resilient Error Handling**:
   - Clear, student-friendly alerts for missing API keys, empty input, and character limits.
   - Comprehensive HTTP error handling for status codes: `400` (Bad Request), `401/403` (Invalid API Key), `429` (Quota Limit), and `5xx` (Server Error).
   - JSON parsing validator with markdown code fence cleaning (` ```json `).
   - Failsafe schema validator checking array lengths, option bounds, and field types.

---

## 🛠️ Technologies Used

| Technology | Role in Project |
| :--- | :--- |
| **HTML5** | Semantic structure (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<form>`), ARIA accessibility labels |
| **CSS3** | CSS Custom Properties (Theme tokens), CSS Grid, Flexbox, 3D Transforms (`perspective`, `transform-style: preserve-3d`), animations |
| **Vanilla JavaScript (ES6+)** | DOM manipulation, `async/await`, Fetch API, Web Speech API, Clipboard API, `localStorage` |
| **Google Gemini API** | Model: `gemini-2.5-flash` (with automated fallback to `gemini-2.0-flash` & `gemini-1.5-flash`) via official Generative Language REST endpoint |

---

## 📂 Project File Structure

```
AI Study Assistant/
│
├── index.html       # Single-page application markup with semantic sections
├── style.css        # Responsive styling, light/dark themes, 3D flip animations
├── script.js        # Core application logic, Gemini API call, validation, quiz, flashcards
└── README.md        # Complete project documentation, viva guide, and setup instructions
```

---

## 🚀 How to Run Locally

Because this project uses vanilla web standards, **no build process, Node.js, or npm install is required**.

### Option 1: Double-Click (Direct Browser Launch)
1. Navigate to the project folder: `AI Study Assistant`.
2. Double-click `index.html` or right-click and choose **Open With -> Google Chrome / Mozilla Firefox / Microsoft Edge / Safari**.

### Option 2: VS Code Live Server (Recommended)
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` and select **"Open with Live Server"**.
4. The project will open at `http://127.0.0.1:5500/index.html`.

### Option 3: Python Built-In Local Server
Open your terminal in the project directory and run:
```bash
# Python 3
python3 -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.

---

## 🔑 How to Obtain & Configure a Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click the blue button: **"Create API key"**.
4. Select or create a Google Cloud project to associate with your key.
5. Copy the generated key (it usually begins with `AIzaSy...`).
6. In **StudyMate AI**:
   - Click the **"API Settings"** button in the top right header.
   - Paste your key into the **"Gemini API Key"** input field.
   - Click **"Save Key"**.
   - Your key is now securely stored in your browser's `localStorage` and will be remembered automatically.

---

## 🌐 How the POST `fetch()` Request Works

The application communicates with Google's Gemini API directly from the browser using the standard `fetch()` API. Here is the exact request lifecycle:

### 1. REST Endpoint URL
```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}
```
*(Note: If a specific model returns HTTP 404, the application automatically retries with `gemini-2.0-flash` or `gemini-1.5-flash`).*

### 2. Request Headers
```javascript
{
  "Content-Type": "application/json"
}
```

### 3. Request Body (JSON)
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "System prompt containing student notes and JSON schema constraints..."
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "temperature": 0.7
  }
}
```

### 4. Response Extraction & Cleaning
1. The server response is checked with `response.ok` and `response.status`.
2. The candidate text is accessed at:
   `data.candidates[0].content.parts[0].text`.
3. If the model wraps the output in markdown code blocks (` ```json ... ``` `), a regular expression strips them:
   ```javascript
   cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
   ```
4. The string is parsed with `JSON.parse(cleaned)`.
5. The `parseAndValidateResponse()` function guarantees that `summary`, exactly 5 `questions` (with 4 options and valid answer index `0..3`), and at least 5 `flashcards` exist before any DOM updates occur.

---

## 🧪 Testing Error Handling Scenarios

You can easily demonstrate the robustness of the application to examiners:

1. **Test Missing API Key**:
   - Click "API Settings" -> "Remove Key".
   - Type a topic and click "Generate Study Material".
   - *Result*: The app displays a clear warning banner directing the student to configure their key or use Demo Mode.

2. **Test Empty Notes**:
   - Leave the notes textarea blank and click "Generate Study Material".
   - *Result*: Shows an alert indicating notes cannot be empty.

3. **Test Character Limit Exceeded**:
   - Paste text with more than 12,000 characters.
   - *Result*: The character counter turns red and displays a warning preventing submission.

4. **Test Invalid API Key (HTTP 401/403)**:
   - In Settings, enter a fake key like `AIzaSyFakeKey12345` and save.
   - Click "Generate Study Material".
   - *Result*: The app catches HTTP 400/403 and displays an understandable error: *"Authentication Failed: Your Google Gemini API key is invalid or expired."*

5. **Test Offline / Network Failure**:
   - Disconnect Wi-Fi or turn on Airplane Mode.
   - Attempt generation.
   - *Result*: The app detects `navigator.onLine === false` and alerts: *"You appear to be offline. Please verify your internet connection."*

---

## 🚢 How to Publish Online (Free Hosting)

Since StudyMate AI is a static web application, it can be deployed for free in under two minutes:

### Option A: GitHub Pages
1. Create a new GitHub repository named `ai-study-assistant`.
2. Push `index.html`, `style.css`, `script.js`, and `README.md` to the `main` branch.
3. In GitHub, go to **Settings -> Pages**.
4. Under **Source**, choose `Deploy from a branch` -> branch `main` -> `/ (root)` folder -> click **Save**.
5. Your project will be live at: `https://<your-username>.github.io/ai-study-assistant/`.

### Option B: Netlify
1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Drag and drop the `AI Study Assistant` folder onto the web page.
3. Netlify will deploy your site instantly with an HTTPS link.

### Option C: Vercel (Recommended)
You can deploy to Vercel in seconds using either method:

**Method 1: One Command via Terminal**
In your terminal, navigate to the project directory and run:
```bash
npx vercel
```
- When prompted `Set up and deploy?`, press `y`.
- Accept the defaults by pressing `Enter`.
- Your app will be deployed and you will receive a live production URL (e.g., `https://ai-study-assistant.vercel.app`)!

**Method 2: Via Vercel Web Dashboard**
1. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/ai-study-assistant.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the `ai-study-assistant` repository.
4. Framework Preset: Leave as **Other** (Static HTML).
5. Click **Deploy**. Vercel will automatically read `vercel.json` and publish your site with a free SSL certificate!

---

## 🖼️ Application Screenshot Placeholder

```
+-----------------------------------------------------------------------------------------+
|  🎓 StudyMate AI    AI-Powered Exam Preparation & Active Recall Assistant   [⚙️] [🌙]    |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  [ Step 1: Enter Class Notes or Topic ]                [💡 Load Sample Notes] [🧹 Clear] |
|  +-----------------------------------------------------------------------------------+  |
|  | Topic: Operating Systems - Process Synchronization & Deadlocks...                  |  |
|  +-----------------------------------------------------------------------------------+  |
|  [ Explanation Style: Exam-Focused v ]   [ Quiz Difficulty: Medium v ]                  |
|  [ ✨ Generate Study Material ]   [ 🧪 Try Demo Mode (Instant) ]                         |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | 📝 Study Summary             [📋 Copy] [📥 Download .txt] [🔊 Read Aloud]          |  |
|  | A critical section is a piece of code that accesses shared resources...           |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | ❓ Interactive Practice Quiz (5 Questions)                         Score: 5/5 (100%)|  |
|  | 1. Which of the following is NOT one of the four Coffman conditions for deadlock? |  |
|  |    ( ) Mutual Exclusion   ( ) Hold & Wait   (*) Preemptive Scheduling [CORRECT]    |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | 🗂️ Active Recall Flashcards                                       Mastered: 3 / 5   |  |
|  | +-------------------------------------------------------------------------------+ |  |
|  | |                      What is Mutual Exclusion?                                | |  |
|  | |                   [🔄 Click or Spacebar to Flip]                              | |  |
|  | +-------------------------------------------------------------------------------+ |  |
|  | [ ◀ Prev ]  Card 1 of 5  [ Next ▶ ]        [ 🔄 Review Again ]  [ ⭐ I Know This! ] |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

*(Tip for college report: Take a real screenshot of your browser running the app and save it as `screenshot.png` in this directory, then embed it using `![App Screenshot](screenshot.png)`).*

---

## ⚠️ Security Notice & Best Practices

> [!CAUTION]
> **Never commit your API key to a public GitHub repository!**
> 
> In this client-side educational application:
> 1. The API key is stored only inside the end-user's local browser (`localStorage`).
> 2. It is never hardcoded in any `.html` or `.js` file.
> 3. For a production-level commercial application, API requests should always be routed through a backend proxy server (such as Node.js Express, Python FastAPI, or Firebase Functions) so that the API key remains secret and rate-limiting can be enforced on the server.

---

## 🎓 College Viva & Project Presentation Q&A Guide

Prepare for questions your professors or external examiners might ask during your project defense:

### Q1: Why did you build this project using Vanilla JavaScript instead of React or Vue?
> **Answer**: Building with Vanilla JavaScript demonstrates a foundational understanding of the core web technologies: the DOM API, JavaScript event loop, asynchronous operations (`async/await`), CSS 3D transforms, and browser storage mechanisms. It eliminates framework overhead, external dependency vulnerabilities, and build complexity, allowing the app to run natively in any modern browser.

### Q2: How does the Flashcard 3D flip effect work in CSS?
> **Answer**: The flip effect relies on three CSS properties:
> 1. `perspective: 1200px` on the parent container, which defines the viewer distance and creates the 3D depth perception.
> 2. `transform-style: preserve-3d` on the card element, ensuring its child faces exist in the 3D plane.
> 3. `backface-visibility: hidden` on both the front and back faces, so the rear face is invisible when turned away.
> 4. When the `.flipped` class is added via JavaScript, `transform: rotateY(180deg)` rotates the card smoothly over 0.6 seconds.

### Q3: How do you guarantee that Gemini outputs valid JSON?
> **Answer**: We use a two-tier approach:
> 1. In the API request, we provide `"responseMimeType": "application/json"` inside `generationConfig`.
> 2. In our prompt, we explicitly define the schema and instruct the model to exclude conversational markdown.
> 3. In `script.js`, our `parseAndValidateResponse()` function uses regex to strip any markdown code fences (` ```json `), calls `JSON.parse()` within a `try/catch` block, and rigorously validates that `questions` contains 5 items and all answer indices are within bounds (0 to 3).

### Q4: How is data stored between page refreshes?
> **Answer**: We use the browser's `localStorage` API to store:
> - The user's Gemini API key (`studymate_gemini_api_key`)
> - The user's light/dark theme preference (`studymate_theme`)
> - Completed study sessions (`studymate_study_history`, capped at the 20 most recent sessions)
> - Cumulative quiz statistics (`studymate_quiz_statistics`)

### Q5: How does the Text-to-Speech feature work without an external audio library?
> **Answer**: It uses the native HTML5 **Web Speech API** via `window.speechSynthesis`. We instantiate a `SpeechSynthesisUtterance` object with the summary text, configure the language, pitch, and rate, and attach `onstart` and `onend` event handlers to update the UI button dynamically between "Read Aloud" and "Stop Reading".

---

## 👨‍💻 Project Developer Notes

- **Course**: B.Tech / B.E. Computer Science & Engineering
- **Project Title**: AI Study Assistant Advanced (StudyMate AI)
- **Year**: Final Year / Pre-Final Year Capstone Project
- **Licence**: MIT Open Source
