🧠 My own Personal Portfolio & Notes Hub 🚀

⚙️ Next.js | ⚛️ React | 🏷️ Version v1.0.0 | 📄 MIT License

==================================================

✨ A modern personal website built with Next.js that serves two purposes:
1️⃣ A clean portfolio showcasing my engineering mindset  
2️⃣ A practical notes hub for organizing and accessing university materials  

🎯 This project is designed with scalability, simplicity, and real-world software architecture principles in mind.

==================================================
🧰 TECH STACK

- ⚙️ Next.js (App Router)
- ⚛️ React
- 🟨 JavaScript (ES6+)
- 🧩 Client Components
- 💾 Local Storage
- 🎨 CSS / Modern UI practices

==================================================
🏗️ ARCHITECTURE OVERVIEW

👤 User (Browser)
      |
      v
🧭 Next.js App Router
      |
      v
🧩 Client Components
(Header, Notes Viewer, Theme Toggle)
      |
      v
🔁 State Management
(useState, useEffect, localStorage)
      |
      v
🗂️ Static Data Layer
(notes object)
      |
      v
📂 Public Assets
(PDF files)

==================================================
📁 PROJECT STRUCTURE

/app
  /page.tsx          ➜ Home page
  /notes/page.tsx    ➜ Notes page

/components
  Header.tsx         ➜ Navigation + Theme toggle
  NotesViewer.tsx   ➜ Dynamic notes renderer

/public
  /MyNotes
    /CHEM101
    /ITSE201
    *.pdf

==================================================
📚 NOTES SYSTEM

All study materials are managed through a centralized data object 🧠

Example:

const notes = {
  Chemistry101: [
    {
      name: "Limits Summary",
      url: "/MyNotes/CHEM101/M-summary.pdf",
    },
  ],
};

🤔 Why this approach?
- ❌ No hardcoded UI
- ➕ Easy to add/remove materials
- 🧠 Acts as a mini data layer inside the frontend

==================================================
🌙 DARK / LIGHT MODE

- 💾 Theme preference stored in localStorage
- 🔄 Automatically restored on page load
- 📱 Smooth UX similar to native applications

==================================================
🧩 HMS WORKSPACE (HIDDEN FEATURE) 🕵️‍♂️

The project includes a hidden workspace mode called HMS Workspace,  
designed as a private area for development, experiments, and internal tools.

🔓 HOW TO ACCESS:
- 🖱️ Click on the profile image
- 🔢 3 consecutive clicks
- ⏱️ Within 0.6 seconds

If the timing and clicks are correct, the HMS Workspace is unlocked 🔓

🎯 WHY HMS WORKSPACE?
- 🔒 Keeps internal tools separate from the public UI
- 🧠 Adds intentional access without authentication
- 🧑‍💻 Reflects an engineer mindset
- 🚀 Allows future expansion

⚙️ TECHNICAL CONCEPT:
- 🖱️ Client-side click detection logic
- ⏱️ Timing-based validation (≤ 600ms)
- 🚫 No backend or authentication required
- 🧪 Extendable to dashboards, admin tools, experiments

==================================================
🎯 KEY DESIGN GOALS

- ✨ Clean and readable code
- 🧱 Scalable structure
- 🪶 No unnecessary complexity
- 🧠 Engineer-first mindset
- 🔌 Easy future backend integration

==================================================
🔮 FUTURE IMPROVEMENTS

- 🔍 Search & filtering for notes
- 🔐 Authentication system
- 🧑‍💼 Admin panel for uploading materials
- 🗄️ Backend API & database
- 📊 Analytics dashboard

==================================================
👨‍💻 AUTHOR

Mohamed Alhayki  
🎓 {Mental} Software Engineering Student  
🛠️ Building systems with long-term vision, not just pages.