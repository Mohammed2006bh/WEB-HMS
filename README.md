🧠 My own Personal Portfolio & Notes Hub 🚀

```text
==================================================
    Live Access - https://m-project-hms.blog
==================================================
```
⚙️ Next.js | ⚛️ React | 🏷️ Version v1.5.7

✨ A modern personal website built with Next.js that serves two purposes:

1️⃣ A clean **personal portfolio** showcasing my engineering mindset  
2️⃣ A practical **notes hub & workspace system** for organizing projects and university materials  

🎯 This project is designed with scalability, structure, and real-world software architecture principles in mind.

==================================================
🧰 TECH STACK

- ⚙️ Next.js (App Router)
- ⚛️ React
- 🟨 TypeScript / JavaScript (ES6+)
- 🧩 Client Components
- 💾 Local Storage
- 🌐 API Routes
- 🎨 CSS (globals.css)
- ☁️ Vercel-ready deployment

==================================================
🏗️ ARCHITECTURE OVERVIEW

👤 User (Browser)
      |
      v
🧭 Next.js App Router
      |
      v
🧩 Layouts & Pages
(site / workspace separation)
      |
      v
🧠 Core Components Layer
(Header, Footer, SBody, TypingText)
      |
      v
🔁 State Management
(useState, useEffect, localStorage)
      |
      v
🗂️ Static Data & Assets
(PDF notes, icons, media)
      |
      v
🌐 API Layer
(route.ts endpoints)

==================================================
📁 PROJECT STRUCTURE (REAL STRUCTURE)

```text
HMS-PORTFOLIO
│
├── app
│   ├── (site)
│   │   ├── page.tsx                ➜ Main landing page
│   │   ├── blog/
│   │   │   └── page.tsx            ➜ Blog section
│   │   ├── BroSum/
│   │   │   └── page.tsx            ➜ Summary / profile section
│   │   ├── HMSAi/
│   │   │   └── page.tsx            ➜ AI-related showcase
│   │   ├── tech/
│   │   │   └── page.tsx            ➜ Tech stack & experiments
│   │   └── layout.tsx              ➜ Site-wide layout
│   │
│   ├── (workspace)
│   │   ├── HMSworkspace/
│   │   │   ├── create/
│   │   │   │   └── page.tsx        ➜ Workspace project creation
│   │   │   └── join/
│   │   │       └── page.tsx        ➜ Join existing workspace
│   │   └── NINA/
│   │       ├── layout.tsx          ➜ Workspace layout
│   │       └── page.tsx            ➜ Internal workspace page
│   │
│   ├── api
│   │   ├── create-project/
│   │   │   └── route.ts            ➜ Create project API
│   │   ├── project-file/
│   │   │   └── route.ts            ➜ Project file handler
│   │   └── test-kv/
│   │       └── route.ts            ➜ KV / backend testing
│
├── components
│   ├── Header.tsx                  ➜ Navigation + theme control
│   ├── Footer.tsx                  ➜ Footer layout
│   ├── SBody.tsx                   ➜ Core structured body component
│   └── TypingText.tsx              ➜ Animated typing text
│
├── public
│   ├── NINAProjects                ➜ The place where all nina projects saves
│   │
│   ├── Mynotes
│   │   ├── CHEM101/
│   │   │   └── CH101.pdf
│   │   ├── IBMZOS/
│   │   │   └── IBMZOS.pdf
│   │   └── ITSE201/
│   │       └── SE201.pdf
│   │
│   ├── HMS_logo.png
│   ├── Bro_LinkedIn.ico
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── PINS.csv
│
├── globals.css
├── package.json
├── tsconfig.json
├── next.config.ts
├── README.md
└── .env.local
```

==================================================
🧠 CORE COMPONENT: SBody

`SBody.tsx` acts as the **central structural component** of the UI.

- 🧱 Responsible for layout composition
- 🔗 Connects internal sections
- 🧠 Separates page entry logic from visual structure
- ♻️ Reusable across pages

This reflects a **clean separation of concerns** and non-monolithic page design.

==================================================
🌙 DARK / LIGHT MODE

- 💾 Theme preference stored in localStorage
- 🔄 Automatically restored on page load
- 📱 Smooth UX similar to native applications

==================================================
🧩 HMS WORKSPACE (HIDDEN FEATURE) 🕵️‍♂️

The project includes a **hidden workspace mode** called **HMS Workspace**.

🔓 HOW TO ACCESS:
- 🖱️ Click on the profile image
- 🔢 3 consecutive clicks
- ⏱️ Within 0.6 seconds

🎯 PURPOSE:
- 🔒 Internal tools separation
- 🧠 Intentional access without authentication
- 🧪 Experimental & admin features
- 🚀 Future expansion ready

```text
☕︎ In Progress [it is not fully operational yet]
```
==================================================
🎯 KEY DESIGN GOALS

- ✨ Clean, readable, and scalable code
- 🧱 Strong architectural separation
- 🧠 Engineer-first mindset
- 🚀 Production-ready structure
- 🔌 Backend & API extensibility

==================================================
🔮 FUTURE IMPROVEMENTS

- 🔍 Advanced search & filtering
- 🔐 Authentication & roles
- 🧑‍💼 Admin dashboard
- 🗄️ Database integration
- 📊 Analytics & logging

==================================================
👨‍💻 AUTHOR

Mohamed Alhayki  
🎓 {Mental} Software Engineering Student  
🛠️ Building systems with long-term vision, not just pages.
