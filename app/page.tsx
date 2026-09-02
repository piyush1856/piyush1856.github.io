"use client"
import { useEffect, useRef, useState } from "react"

interface GitHubStats {
  public_repos: number
  followers: number
  following: number
  bio: string | null
  avatar_url: string
  html_url: string
  created_at: string
}

interface GitHubAdditionalStats {
  totalContributions: number
  currentStreak: number
  totalStars: number
  totalForks: number
}

const roles = [
  "Backend & AI Engineer",
  "AI Platform Engineer",
  "Multi-Agent Systems Builder",
  "GenAI Engineer",
]

export default function Home() {
  const [isDark, setIsDark] = useState(true)
  const [activeSection, setActiveSection] = useState("about")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null)
  const [additionalStats, setAdditionalStats] = useState<GitHubAdditionalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const sectionsRef = useRef<(HTMLElement | null)[]>([])
  const [scrollProgress, setScrollProgress] = useState(0)

  // Typing animation state
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0)
  const [currentText, setCurrentText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  // Typing animation effect
  useEffect(() => {
    const currentRole = roles[currentRoleIndex]
    let timeout: NodeJS.Timeout

    if (!isDeleting && currentText.length < currentRole.length) {
      timeout = setTimeout(() => {
        setCurrentText(currentRole.slice(0, currentText.length + 1))
      }, 80)
    } else if (!isDeleting && currentText.length === currentRole.length) {
      timeout = setTimeout(() => {
        setIsDeleting(true)
      }, 1600)
    } else if (isDeleting && currentText.length > 0) {
      timeout = setTimeout(() => {
        setCurrentText(currentRole.slice(0, currentText.length - 1))
      }, 40)
    } else if (isDeleting && currentText.length === 0) {
      setIsDeleting(false)
      setCurrentRoleIndex((prev) => (prev + 1) % roles.length)
    }

    return () => clearTimeout(timeout)
  }, [currentText, currentRoleIndex, isDeleting])

  useEffect(() => {
    const fetchGitHubData = async () => {
      try {
        const userResponse = await fetch("https://api.github.com/users/piyush1856")
        const userData = await userResponse.json()
        setGithubStats(userData)

        let allRepos: any[] = []
        let page = 1
        let hasMore = true

        while (hasMore && page <= 10) {
          try {
            const reposResponse = await fetch(
              `https://api.github.com/users/piyush1856/repos?per_page=100&page=${page}&sort=updated`
            )

            if (!reposResponse.ok) {
              console.error(`Failed to fetch repos page ${page}:`, reposResponse.status)
              break
            }

            const reposData = await reposResponse.json()

            if (reposData.message) {
              console.error("GitHub API error:", reposData.message)
              break
            }

            if (!Array.isArray(reposData) || reposData.length === 0) {
              hasMore = false
            } else {
              allRepos = [...allRepos, ...reposData]
              page++
              if (reposData.length < 100) {
                hasMore = false
              }
            }
          } catch (error) {
            console.error(`Error fetching repos page ${page}:`, error)
            break
          }
        }

        let totalStars = 0
        let totalForks = 0
        for (const repo of allRepos) {
          if (repo && typeof repo.stargazers_count === "number") {
            totalStars += repo.stargazers_count
          }
          if (repo && typeof repo.forks_count === "number") {
            totalForks += repo.forks_count
          }
        }

        let totalContributions = 0
        let currentStreak = 0

        try {
          const totalsResponse = await fetch(
            "https://github-contributions-api.jogruber.de/v4/piyush1856"
          )

          if (totalsResponse.ok) {
            const totalsData = await totalsResponse.json()

            if (totalsData.total) {
              totalContributions = Object.values(totalsData.total).reduce(
                (sum: number, yearTotal: any) => sum + (yearTotal || 0),
                0
              ) as number
            }
          }

          const contributionsResponse = await fetch(
            "https://github-contributions-api.jogruber.de/v4/piyush1856?y=last"
          )

          if (contributionsResponse.ok) {
            const contributionsData = await contributionsResponse.json()

            if (contributionsData.contributions) {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              let streak = 0

              for (let i = 0; i < 365; i++) {
                const checkDate = new Date(today)
                checkDate.setDate(checkDate.getDate() - i)
                const dateStr = checkDate.toISOString().split("T")[0]

                const day = contributionsData.contributions.find(
                  (d: any) => d.date === dateStr
                )

                if (day && day.count > 0) {
                  streak++
                } else if (i === 0) {
                  continue
                } else {
                  break
                }
              }
              currentStreak = streak
            }
          }
        } catch (error) {
          console.error("Error fetching contribution stats:", error)
        }

        setAdditionalStats({
          totalContributions,
          currentStreak,
          totalStars,
          totalForks,
        })
      } catch (error) {
        console.error("Error fetching GitHub data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGitHubData()
  }, [])

  useEffect(() => {
    const checkAndAnimateSection = (section: HTMLElement) => {
      const rect = section.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const isVisible = rect.top < windowHeight * 0.8 && rect.bottom > windowHeight * 0.2

      if (isVisible && !section.classList.contains("animate-fade-in-up")) {
        section.classList.add("animate-fade-in-up")
        setActiveSection(section.id)
      }
    }

    const calculateScrollProgress = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight - windowHeight
      const scrolled = window.scrollY
      const progress = (scrolled / documentHeight) * 100
      setScrollProgress(Math.min(100, Math.max(0, progress)))
    }

    const hash = window.location.hash.slice(1)
    if (hash) {
      const targetSection = sectionsRef.current.find((section) => section?.id === hash)
      if (targetSection) {
        setTimeout(() => {
          targetSection.classList.add("animate-fade-in-up")
          setActiveSection(hash)
        }, 300)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up")
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    )

    sectionsRef.current.forEach((section) => {
      if (section) {
        checkAndAnimateSection(section)
        observer.observe(section)
      }
    })

    const handleScroll = () => {
      calculateScrollProgress()
      sectionsRef.current.forEach((section) => {
        if (section && !section.classList.contains("animate-fade-in-up")) {
          checkAndAnimateSection(section)
        }
      })
    }

    calculateScrollProgress()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setTimeout(() => {
        if (!element.classList.contains("animate-fade-in-up")) {
          element.classList.add("animate-fade-in-up")
        }
        setActiveSection(id)
      }, 500)
    }
    setMobileMenuOpen(false)
  }

  const navigationItems = [
    "about",
    "focus",
    "experience",
    "skills",
    "education",
    "github-contributions",
    "connect",
  ]

  const focusAreas = [
    {
      id: 1,
      title: "Multi-Agent Orchestration",
      description:
        "Domain-specialist subagents on LangGraph with dynamic routing, per-tenant graph caching, and context compression — one agent pipeline serving both conversational and machine-readable workflows.",
      tags: ["LangGraph", "LangChain", "LiteLLM"],
    },
    {
      id: 2,
      title: "MCP Tool Platforms",
      description:
        "Enterprise backends exposed as typed, tenant-aware AI tools — 200+ callable tools across CRM, commerce, and analytics, with input validation and ~90% schema-token compression.",
      tags: ["Model Context Protocol", "FastAPI", "Pydantic"],
    },
    {
      id: 3,
      title: "RAG & NL-to-SQL",
      description:
        "Production retrieval pipelines: hybrid BM25 + dense vector search with RRF, Voyage reranking, SQL self-correction, and read-only BigQuery guardrails for analytics over natural language.",
      tags: ["Qdrant", "Voyage AI", "BigQuery"],
    },
    {
      id: 4,
      title: "Guardrails, HITL & Evals",
      description:
        "Human-in-the-loop confirmation for destructive actions, per-tool policy enforcement, PII scrubbing, LangSmith tracing, and domain-specific eval suites for regression-safe agents.",
      tags: ["LangSmith", "Langfuse", "AI Guardrails"],
    },
  ]

  const experience = [
    {
      id: 1,
      role: "Software Development Engineer I (Backend & AI)",
      company: "WizCommerce (Oritur Technologies Pvt Ltd)",
      period: "Sep 2025 — Present",
      location: "Bengaluru",
      highlights: [
        "Co-architected WizCommerce's shared AI platform — reusable agent orchestration, LLM infrastructure, and enterprise AI services behind WizPilot, WizStudio, Ella, and Workflow Engine.",
        "Built WizPilot, the in-app agentic assistant connecting WizOrder with CRM, catalog, cart, analytics, and order management — sales teams run end-to-end B2B workflows in natural language.",
        "Designed a database-configured, multi-tenant agent execution layer with per-tenant graph caching, PostgreSQL-backed conversation state, and dynamic MCP/subagent registration.",
        "Built a reusable MCP platform exposing 200+ typed, tenant-aware tools; dynamic tool compression cut LLM schema-token overhead by ~90%.",
        "Shipped a production RAG NL-to-SQL pipeline (retrieve → generate → validate → secure → execute) with Qdrant retrieval, Voyage reranking, and read-only BigQuery guardrails.",
        "Built a tenant-scoped Knowledge Base with hybrid BM25 + dense retrieval (RRF), SSE streaming of tokens, tool calls and reasoning, agent skills, and cross-thread long-term memory.",
        "Implemented guardrails and human-in-the-loop controls — confirmation flows for destructive mutations, per-tool policies, and PII scrubbing — for safe, auditable AI actions.",
        "Cut critical endpoint latency by 80%, reduced system errors by 32%, and built a parallelized migration pipeline moving 1M+ records at 1,000+ docs/sec.",
      ],
      tech: ["Python", "FastAPI", "LangGraph", "MCP", "LiteLLM", "PostgreSQL", "Qdrant", "BigQuery", "Elasticsearch", "Redis"],
    },
    {
      id: 2,
      role: "Software Development Engineer I (GenAI)",
      company: "Fynd (Shopsense Retail Technologies Ltd)",
      period: "Feb 2025 — Aug 2025",
      location: "Mumbai",
      highlights: [
        "Led backend development for the Fynix AI coding assistant powering the IntelliJ and VS Code extensions and the Fynix web platform.",
        "Improved codebase indexing speed by 90%+ through optimization of embedding models, vector databases, and keyword/vector search.",
        "Designed ETL pipelines integrating GitHub, GitLab, Azure DevOps, Quip, Google Docs, and BigQuery; ingested Stack Overflow and public GitHub datasets to enrich LLM context.",
        "Expanded Fynix from a coding assistant into a data-analysis agent using LangChain and LangGraph; boosted accuracy with intent detection and improved RAG workflows.",
        "Implemented full-stack observability via Sentry, Prometheus, Grafana, and New Relic; ensured SOC 2 and GDPR compliance.",
      ],
      tech: ["Python", "Java", "Kotlin", "LangChain", "LangGraph", "Vector DB", "OpenAI", "Claude"],
    },
    {
      id: 3,
      role: "Backend Developer (Founding Team)",
      company: "Growder Technovations & Ompax Lifestyle",
      period: "Mar 2023 — May 2024",
      location: "Surat",
      highlights: [
        "Engineered high-performance backend architectures across two early-stage B2B platforms using Java, Spring Boot, and distributed microservices.",
        "Designed a large-scale Order Management System and production-grade user management with JWT auth and RBAC — throughput up 70–80%.",
        "Built configuration-driven integrations with Shiprocket, Shopify, GST/PAN verification, payment gateways, and SMS/email providers.",
        "Automated warehousing, logistics, and inventory through event-driven microservices — operational efficiency up 25%, reporting 40% faster.",
      ],
      tech: ["Java", "Spring Boot", "MySQL", "PostgreSQL", "Elasticsearch", "AWS", "RabbitMQ"],
    },
  ]

  const skills = {
    "AI & LLM": [
      "Multi-Agent Systems",
      "Agentic AI",
      "RAG",
      "Model Context Protocol (MCP)",
      "Prompt Engineering",
      "Tool Calling",
      "NL-to-SQL",
      "Hybrid Search (BM25 + Vector / RRF)",
      "Reranking",
      "AI Guardrails & HITL",
      "LLM Evaluation",
      "LangSmith",
      "Langfuse",
      "Voyage AI",
      "OpenAI",
      "Anthropic Claude",
      "Google Gemini",
    ],
    "Languages & Frameworks": [
      "Python",
      "Java",
      "JavaScript",
      "SQL",
      "FastAPI",
      "LangChain",
      "LangGraph",
      "LiteLLM",
      "Spring Boot",
      "SQLAlchemy",
      "Alembic",
      "Pydantic",
      "Pytest",
      "JUnit",
    ],
    "Cloud & DevOps": [
      "AWS (S3, EC2, Lambda)",
      "GCP (BigQuery, Cloud SQL, GCS)",
      "Docker",
      "Kubernetes",
      "CI/CD",
      "Grafana",
      "Prometheus",
      "Sentry",
      "New Relic",
    ],
    "Data & Messaging": [
      "PostgreSQL",
      "MySQL",
      "Redis",
      "Qdrant",
      "Elasticsearch",
      "Kafka",
      "RabbitMQ",
      "Kibana",
    ],
    "Engineering": [
      "Multi-Tenant Architecture",
      "Microservices",
      "Streaming APIs & SSE",
      "REST APIs",
      "API Gateway",
      "High-Level Design",
      "Low-Level Design",
      "Data Structures & Algorithms",
    ],
    "ML & Data": [
      "Supervised & Unsupervised Learning",
      "Feature Engineering",
      "Model Evaluation",
      "Scikit-Learn",
      "EDA",
      "Statistical Analysis",
      "Tableau",
      "Matplotlib & Seaborn",
    ],
  }

  const education = [
    {
      id: 1,
      degree: "Master of Computer Applications (MCA)",
      field: "Machine Learning and Artificial Intelligence",
      institution: "Amity University, Noida",
      year: "2025",
    },
    {
      id: 2,
      degree: "Bachelor of Business Administration (BBA)",
      field: "",
      institution: "Birla Institute of Technology, Mesra",
      year: "2020",
    },
    {
      id: 3,
      degree: "Certification",
      field: "Data Science and Machine Learning",
      institution: "Scaler DSML",
      year: "2025",
    },
    {
      id: 4,
      degree: "Certification",
      field: "Full Stack Web Development",
      institution: "Masai School, Bengaluru",
      year: "2023",
    },
  ]

  const heroStats = [
    { value: "3+", label: "years building backend & AI systems" },
    { value: "200+", label: "AI tools live across enterprise domains" },
    { value: "~90%", label: "LLM schema-token overhead eliminated" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Scroll progress */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-accent to-accent-2 z-[60] transition-[width] duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => scrollToSection("about")}
            className="flex items-center gap-2 text-lg font-medium tracking-tight"
          >
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-accent to-accent-2" />
            Piyush Tyagi
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            {navigationItems.map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item)}
                className={`text-[13px] tracking-wide transition-colors capitalize ${
                  activeSection === item
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item === "github-contributions" ? "GitHub" : item.replace("-", " ")}
              </button>
            ))}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={toggleTheme} className="p-2 hover:bg-muted rounded-lg">
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-muted rounded-lg"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
            <div className="max-w-5xl mx-auto px-4 py-4 space-y-1">
              {navigationItems.map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="block w-full text-left px-4 py-2.5 rounded-lg hover:bg-muted text-sm capitalize"
                >
                  {item === "github-contributions" ? "GitHub" : item.replace("-", " ")}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Vertical Navigation Sidebar */}
      <nav className="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
        <div className="flex flex-col gap-6">
          {navigationItems.map((item) => {
            const isActive = activeSection === item
            return (
              <button
                key={item}
                onClick={() => scrollToSection(item)}
                className="group relative flex items-center gap-3"
                aria-label={`Navigate to ${item}`}
              >
                <div
                  className={`rounded-full transition-all duration-300 flex-shrink-0 ${
                    isActive
                      ? "bg-accent w-2.5 h-2.5 shadow-[0_0_12px_var(--accent)]"
                      : "bg-muted-foreground/50 w-1.5 h-1.5 group-hover:bg-accent/60"
                  }`}
                />
                <span
                  className={`text-[11px] font-mono capitalize transition-opacity whitespace-nowrap ${
                    isActive
                      ? "text-accent opacity-100"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {item === "github-contributions" ? "github" : item.replace("-", " ")}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24">
        {/* ===== Hero ===== */}
        <section
          id="about"
          ref={(el) => { sectionsRef.current[0] = el }}
          className="relative min-h-[92vh] flex items-center py-20 opacity-0"
        >
          {/* Ambient decorations */}
          <div className="absolute inset-0 -mx-4 sm:-mx-6 bg-dots pointer-events-none" aria-hidden="true" />
          <div
            className="absolute top-1/4 -right-24 w-[420px] h-[420px] rounded-full bg-accent/10 blur-3xl animate-drift pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-1/4 -left-32 w-[360px] h-[360px] rounded-full bg-accent-2/10 blur-3xl animate-drift pointer-events-none"
            aria-hidden="true"
            style={{ animationDelay: "-7s" }}
          />

          <div className="relative space-y-10 w-full">
            <div className="space-y-6">
              <p className="font-mono text-sm text-muted-foreground h-6 flex items-center">
                <span className="text-accent-2 mr-2">➜</span>
                <span className="text-accent">~/piyush</span>
                <span className="mx-2 text-muted-foreground/60">·</span>
                <span>{currentText || " "}</span>
                <span className="inline-block w-[7px] h-4 bg-accent ml-1 animate-blink flex-shrink-0" />
              </p>

              <h2 className="text-[2.75rem] leading-[1.05] sm:text-7xl font-light tracking-tight text-balance">
                I build <span className="text-gradient font-normal">multi-agent AI platforms</span>
                <br className="hidden sm:block" /> and the backends that power them.
              </h2>

              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Backend &amp; AI platform engineer at WizCommerce — agent orchestration, MCP tool
                platforms, RAG pipelines, and multi-tenant LLM infrastructure for enterprise
                commerce. Python and Java, from prompt to production.
              </p>
            </div>

            {/* Proof points */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl">
              {heroStats.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <p className="text-2xl sm:text-4xl font-light text-foreground">{stat.value}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => scrollToSection("experience")}
                className="px-6 py-3 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                View experience
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://drive.google.com/file/d/1CJwGnjc5k5p8CZzylUHnbhqSIFoETj2J/view?usp=drive_link",
                    "_blank",
                  )
                }
                className="px-6 py-3 border border-border rounded-full text-sm text-foreground hover:border-accent/50 hover:text-accent transition-colors"
              >
                Open resume
              </button>
              <div className="flex gap-5 sm:ml-2 text-sm">
                <a
                  href="https://github.com/piyush1856"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-accent transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://linkedin.com/in/piyush-tyagi-308930246"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-accent transition-colors"
                >
                  LinkedIn
                </a>
                <a
                  href="https://leetcode.com/piyush1856"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-accent transition-colors"
                >
                  LeetCode
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== AI Platform Work ===== */}
        <section
          id="focus"
          ref={(el) => { sectionsRef.current[1] = el }}
          className="py-20 sm:py-28 opacity-0"
        >
          <div className="space-y-12">
            <div className="space-y-3">
              <p className="font-mono text-xs text-accent-2 tracking-widest uppercase">01 · Focus</p>
              <h2 className="text-3xl sm:text-5xl font-light tracking-tight">AI platform work</h2>
              <p className="text-muted-foreground max-w-2xl text-sm sm:text-base leading-relaxed">
                The systems I spend my days on — the layer between large language models and
                enterprise backends.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {focusAreas.map((area, i) => (
                <div key={area.id} className="card-surface p-7 space-y-4">
                  <p className="font-mono text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-xl font-medium tracking-tight">{area.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{area.description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {area.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-[11px] font-mono rounded-full border border-border text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Experience ===== */}
        <section
          id="experience"
          ref={(el) => { sectionsRef.current[2] = el }}
          className="py-20 sm:py-28 opacity-0"
        >
          <div className="space-y-12">
            <div className="space-y-3">
              <p className="font-mono text-xs text-accent-2 tracking-widest uppercase">02 · Experience</p>
              <h2 className="text-3xl sm:text-5xl font-light tracking-tight">Where I&apos;ve worked</h2>
            </div>

            <div className="space-y-6">
              {experience.map((job) => (
                <article key={job.id} className="card-surface p-7 sm:p-9 space-y-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-medium tracking-tight">{job.role}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.company} · {job.location}
                      </p>
                    </div>
                    <p className="font-mono text-xs text-accent">{job.period}</p>
                  </div>

                  <ul className="space-y-2.5">
                    {job.highlights.map((point, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-muted-foreground leading-relaxed flex gap-3"
                      >
                        <span className="text-accent-2 flex-shrink-0 mt-[1px]">▸</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {job.tech.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 text-[11px] font-mono rounded-full bg-muted text-muted-foreground"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Skills ===== */}
        <section
          id="skills"
          ref={(el) => { sectionsRef.current[3] = el }}
          className="py-20 sm:py-28 opacity-0"
        >
          <div className="space-y-12">
            <div className="space-y-3">
              <p className="font-mono text-xs text-accent-2 tracking-widest uppercase">03 · Skills</p>
              <h2 className="text-3xl sm:text-5xl font-light tracking-tight">Tools of the trade</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category} className="card-surface p-7 space-y-4">
                  <h3 className="text-sm font-mono text-accent tracking-wide">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:border-accent/40 hover:text-foreground transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Education ===== */}
        <section
          id="education"
          ref={(el) => { sectionsRef.current[4] = el }}
          className="py-20 sm:py-28 opacity-0"
        >
          <div className="space-y-12">
            <div className="space-y-3">
              <p className="font-mono text-xs text-accent-2 tracking-widest uppercase">04 · Education</p>
              <h2 className="text-3xl sm:text-5xl font-light tracking-tight">Degrees &amp; certifications</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {education.map((edu) => (
                <article key={edu.id} className="card-surface p-7 space-y-2">
                  <p className="font-mono text-xs text-accent">{edu.year}</p>
                  <h3 className="text-lg font-medium tracking-tight">{edu.degree}</h3>
                  {edu.field && <p className="text-sm text-muted-foreground">{edu.field}</p>}
                  <p className="text-sm text-muted-foreground/80">{edu.institution}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== GitHub ===== */}
        <section
          id="github-contributions"
          ref={(el) => { sectionsRef.current[5] = el }}
          className="py-20 sm:py-28 opacity-0"
        >
          <div className="space-y-12">
            <div className="space-y-3">
              <p className="font-mono text-xs text-accent-2 tracking-widest uppercase">05 · GitHub</p>
              <h2 className="text-3xl sm:text-5xl font-light tracking-tight">Open activity</h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="font-mono text-sm text-muted-foreground">fetching github stats…</p>
              </div>
            ) : githubStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Contributions",
                      value: additionalStats?.totalContributions?.toLocaleString() || "—",
                    },
                    {
                      label: "Current Streak",
                      value: additionalStats?.currentStreak
                        ? `${additionalStats.currentStreak}d`
                        : "—",
                    },
                    { label: "Repositories", value: githubStats?.public_repos ?? "—" },
                    {
                      label: "Stars",
                      value: additionalStats?.totalStars?.toLocaleString() || "—",
                    },
                    {
                      label: "Forks",
                      value: additionalStats?.totalForks?.toLocaleString() || "—",
                    },
                    { label: "Followers", value: githubStats?.followers ?? "—" },
                    { label: "Following", value: githubStats?.following ?? "—" },
                    {
                      label: "Member Since",
                      value: githubStats?.created_at
                        ? new Date(githubStats.created_at).getFullYear()
                        : "—",
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="card-surface p-6">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                        {stat.label}
                      </p>
                      <p className="text-2xl sm:text-3xl font-light text-accent">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="card-surface p-4 overflow-hidden">
                  <img
                    src={`https://github-readme-activity-graph.vercel.app/graph?username=piyush1856&theme=${isDark ? "github-dark" : "minimal"}&hide_border=true&bg_color=transparent&area=true&color=${isDark ? "#a78bfa" : "#7c3aed"}&line=${isDark ? "#8b5cf6" : "#6d28d9"}&point=${isDark ? "#c4b5fd" : "#5b21b6"}`}
                    alt="GitHub Contribution Graph"
                    className="w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Unable to load GitHub stats</p>
              </div>
            )}
          </div>
        </section>

        {/* ===== Connect ===== */}
        <section
          id="connect"
          ref={(el) => { sectionsRef.current[6] = el }}
          className="py-20 sm:py-32 opacity-0"
        >
          <div className="card-surface relative overflow-hidden p-8 sm:p-14">
            <div
              className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-accent/10 blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative grid lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <p className="font-mono text-xs text-accent-2 tracking-widest uppercase">06 · Connect</p>
                <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-balance">
                  Let&apos;s build something <span className="text-gradient font-normal">intelligent</span>.
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md">
                  Open to conversations about AI platforms, agent systems, backend architecture — or
                  interesting problems in general.
                </p>
                <a
                  href="mailto:piyushtyagi28@hotmail.com"
                  className="inline-block px-6 py-3 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Say hello →
                </a>
              </div>

              <div className="space-y-6 lg:pt-10">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      Email
                    </p>
                    <a
                      href="mailto:piyushtyagi28@hotmail.com"
                      className="text-foreground hover:text-accent transition-colors"
                    >
                      piyushtyagi28@hotmail.com
                    </a>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      Phone
                    </p>
                    <a href="tel:+919973061351" className="text-foreground hover:text-accent transition-colors">
                      +91 9973061351
                    </a>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      Location
                    </p>
                    <p className="text-foreground">Bengaluru, Karnataka</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                      Elsewhere
                    </p>
                    <div className="flex gap-5">
                      <a
                        href="https://github.com/piyush1856"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        GitHub
                      </a>
                      <a
                        href="https://linkedin.com/in/piyush-tyagi-308930246"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        LinkedIn
                      </a>
                      <a
                        href="https://leetcode.com/piyush1856"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        LeetCode
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground/70 text-center pt-12">
            © 2025 Piyush Tyagi · built with Next.js
          </p>
        </section>
      </main>
    </div>
  )
}
