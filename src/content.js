// ─────────────────────────────────────────────────────────────
//  EDIT THIS FILE — every piece of text on the site lives here.
//  The particle name in the hero is generated from `name`.
// ─────────────────────────────────────────────────────────────

export const content = {
  name: 'Deep Raj',
  role: 'Full-Stack Software Engineer',
  tagline: 'I design and ship scalable full-stack & AI-powered web apps with React, Next.js, Node.js and TypeScript.',
  location: 'Jaipur, India',
  timezone: 'Asia/Kolkata',
  email: 'vermadeepraj03@gmail.com',
  photo: '/portrait.webp', // background removed — it becomes the About particle portrait
  resume: '/resume.pdf',
  available: true,

  about: {
    statement: 'I build products end to end — from pixel-perfect React interfaces to the APIs, auth and AI pipelines behind them.',
    paragraphs: [
      'I am a full-stack software engineer who designs and deploys scalable web applications with React, Next.js, Node.js and TypeScript — with a strong foundation in data structures & algorithms, RESTful API design, backend architecture, authentication and CI/CD.',
      'Lately I live where software meets AI: RAG pipelines, LLM APIs (Gemini, OpenAI, Claude), vector databases and automation workflows that make products genuinely smarter.',
    ],
    stats: [
      { value: 500, suffix: '+', label: 'DSA problems solved' },
      { value: 40, suffix: '%', label: 'Faster support replies at Flyzygo' },
      { value: 3, suffix: '', label: 'Full-stack AI products shipped' },
    ],
  },

  experience: [
    {
      role: 'SDE-1 Intern',
      org: 'Flyzygo',
      where: 'Remote',
      period: 'Jun 2025 — Aug 2025',
      points: [
        'Designed and deployed a WhatsApp chatbot system on n8n, cutting customer response time by 40%.',
        'Built automated backend workflows with Supabase, Webhooks and RAG for intelligent query handling and real-time data sync.',
        'Integrated AI APIs for contextual response generation, improving accuracy and backend efficiency.',
      ],
      tags: ['n8n', 'Supabase', 'Webhooks', 'RAG', 'AI APIs'],
    },
    {
      role: 'B.Tech, Metallurgical & Materials Engineering',
      org: 'MNIT Jaipur',
      where: 'Malaviya National Institute of Technology',
      period: '2022 — Present',
      points: ['CGPA 7.96 · CS coursework: Data Structures & Algorithms, OOP, Operating Systems, Computer Networks, DBMS.'],
      tags: ['CGPA 7.96'],
    },
    {
      role: 'Class XII (CBSE)',
      org: 'RMSG Public School',
      where: 'Jhansi',
      period: '2021',
      points: ['Scored 93.2%.'],
      tags: ['93.2%'],
    },
  ],

  skills: [
    { group: 'Languages', items: ['JavaScript (ES6+)', 'TypeScript', 'Python', 'C++', 'SQL', 'HTML5 / CSS3'] },
    { group: 'Frontend', items: ['React.js', 'Next.js 14', 'Tailwind CSS', 'D3.js', 'Responsive UI'] },
    { group: 'Backend', items: ['Node.js', 'Express.js', 'REST APIs', 'Webhooks', 'MVC'] },
    { group: 'Data & DevOps', items: ['PostgreSQL', 'MongoDB', 'MySQL', 'Supabase', 'Docker', 'CI/CD', 'Git'] },
    { group: 'Auth & Security', items: ['JWT', 'OAuth 2.0', 'Clerk', 'Appwrite', 'RBAC', 'Permit.io'] },
    { group: 'AI / ML', items: ['LangChain', 'Gemini API', 'OpenAI API', 'Claude API', 'RAG', 'Vector DBs', 'n8n'] },
  ],

  // `color` tints the particle universe while the project is hovered.
  projects: [
    {
      title: 'Collaborative Docs',
      description: 'Real-time collaborative editor with multi-user editing and live cursors, RBAC (viewer/editor/admin) via Appwrite + Permit.io, and a Docker-based authorization service.',
      tags: ['Next.js 14', 'TypeScript', 'Liveblocks', 'Docker'],
      meta: 'Real-time',
      url: 'https://github.com/vermadeepraj/Collaborative--docs',
      color: '#7cf7ff',
    },
    {
      title: 'Sensai',
      description: 'AI career coach: resume analysis, mock interviews with real-time feedback and skill-gap analysis on Gemini — with Clerk auth, Neon PostgreSQL and Inngest email workflows.',
      tags: ['Next.js 14', 'Gemini API', 'PostgreSQL', 'Clerk'],
      meta: 'AI · SaaS',
      url: 'https://sensai-rose-gamma.vercel.app/',
      repo: 'https://github.com/vermadeepraj/sensai',
      color: '#ffb547',
    },
    {
      title: 'SkillPath AI',
      description: 'MERN platform that turns skill assessments into AI-generated learning paths, with JWT REST APIs, Gemini fallback handling, D3.js visualisations and CI/CD to Vercel + Render.',
      tags: ['React', 'Node', 'MongoDB', 'D3.js'],
      meta: 'AI · MERN',
      url: 'https://skillpath-taupe-deep.vercel.app',
      repo: 'https://github.com/vermadeepraj/skill_path_ai',
      color: '#54ffb0',
    },
  ],

  socials: [
    { label: 'GitHub', url: 'https://github.com/vermadeepraj' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/deeprajdev/' },
    { label: 'Resume', url: '/resume.pdf' },
  ],
}
