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
  "Backend Software Engineer",
  "AI Engineer",
  "Java Developer",
  "Python Developer",
  "GenAI Engineer"
]

export default function Home() {
  const [isDark, setIsDark] = useState(true)
  const [activeSection, setActiveSection] = useState("about")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null)
  const [additionalStats, setAdditionalStats] = useState<GitHubAdditionalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const sectionsRef = useRef<(HTMLElement | null)[]>([])
  
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
      // Typing
      timeout = setTimeout(() => {
        setCurrentText(currentRole.slice(0, currentText.length + 1))
      }, 100)
    } else if (!isDeleting && currentText.length === currentRole.length) {
      // Pause before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true)
      }, 1000)
    } else if (isDeleting && currentText.length > 0) {
      // Deleting
      timeout = setTimeout(() => {
        setCurrentText(currentRole.slice(0, currentText.length - 1))
      }, 50)
    } else if (isDeleting && currentText.length === 0) {
      // Move to next role
      setIsDeleting(false)
      setCurrentRoleIndex((prev) => (prev + 1) % roles.length)
    }

    return () => clearTimeout(timeout)
  }, [currentText, currentRoleIndex, isDeleting])

  useEffect(() => {
    const fetchGitHubData = async () => {
      try {
        // Fetch user stats
        const userResponse = await fetch("https://api.github.com/users/piyush1856")
        const userData = await userResponse.json()
        setGithubStats(userData)

        // Fetch all repositories to calculate accurate stats (handle pagination)
        let allRepos: any[] = []
        let page = 1
        let hasMore = true

        while (hasMore && page <= 10) {
          // Limit to 10 pages to avoid infinite loops
          try {
            const reposResponse = await fetch(
              `https://api.github.com/users/piyush1856/repos?per_page=100&page=${page}&sort=updated`
            )
            
            if (!reposResponse.ok) {
              console.error(`Failed to fetch repos page ${page}:`, reposResponse.status)
              break
            }

            const reposData = await reposResponse.json()
            
            // Check if response is an error object
            if (reposData.message) {
              console.error("GitHub API error:", reposData.message)
              break
            }
            
            if (!Array.isArray(reposData) || reposData.length === 0) {
              hasMore = false
            } else {
              allRepos = [...allRepos, ...reposData]
              page++
              // Stop if we got less than 100 (last page)
              if (reposData.length < 100) {
                hasMore = false
              }
            }
          } catch (error) {
            console.error(`Error fetching repos page ${page}:`, error)
            break
          }
        }

        // Calculate real stats from all repositories
        let totalStars = 0
        let totalForks = 0
        for (const repo of allRepos) {
          if (repo && typeof repo.stargazers_count === 'number') {
            totalStars += repo.stargazers_count
          }
          if (repo && typeof repo.forks_count === 'number') {
            totalForks += repo.forks_count
          }
        }

        // Verify we got the expected number of repos
        if (allRepos.length !== githubStats?.public_repos && githubStats?.public_repos) {
          console.warn(`Expected ${githubStats.public_repos} repos but fetched ${allRepos.length}`)
        }

        // Fetch contribution data using GitHub Contributions API (third-party service)
        // API: https://github-contributions-api.jogruber.de
        // This works without authentication and is reliable for static sites
        let totalContributions = 0
        let currentStreak = 0

        try {
          // First, get all-time totals by year
          const totalsResponse = await fetch(
            "https://github-contributions-api.jogruber.de/v4/piyush1856"
          )

          if (totalsResponse.ok) {
            const totalsData = await totalsResponse.json()
            
            // Sum all years for total contributions
            if (totalsData.total) {
              totalContributions = Object.values(totalsData.total).reduce(
                (sum: number, yearTotal: any) => sum + (yearTotal || 0),
                0
              ) as number
            }
          }

          // Fetch last year's data for streak calculation
          const contributionsResponse = await fetch(
            "https://github-contributions-api.jogruber.de/v4/piyush1856?y=last"
          )

          if (contributionsResponse.ok) {
            const contributionsData = await contributionsResponse.json()

            // Calculate current streak from contributions array
            if (contributionsData.contributions) {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              let streak = 0

              // Check backwards from today
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
                  // Today has no contributions, continue checking yesterday
                  continue
                } else {
                  // Hit a day with no contributions, stop
                  break
                }
              }
              currentStreak = streak
            }
          }
        } catch (error) {
          console.error("Error fetching contribution stats:", error)
          // Leave as 0 if fetch fails
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
    // Function to check if section is visible and animate it
    const checkAndAnimateSection = (section: HTMLElement) => {
      const rect = section.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const isVisible = rect.top < windowHeight * 0.8 && rect.bottom > windowHeight * 0.2
      
      if (isVisible && !section.classList.contains("animate-fade-in-up")) {
        section.classList.add("animate-fade-in-up")
        setActiveSection(section.id)
      }
    }

    // Check for hash navigation on mount
    const hash = window.location.hash.slice(1)
    if (hash) {
      const targetSection = sectionsRef.current.find((section) => section?.id === hash)
      if (targetSection) {
        // Wait for scroll to complete, then animate
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
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }, // More lenient for mobile
    )

    // Check all sections on mount and observe them
    sectionsRef.current.forEach((section) => {
      if (section) {
        // Check if already visible (for initial load or direct navigation)
        checkAndAnimateSection(section)
        observer.observe(section)
      }
    })

    // Also check on scroll for immediate feedback
    const handleScroll = () => {
      sectionsRef.current.forEach((section) => {
        if (section && !section.classList.contains("animate-fade-in-up")) {
          checkAndAnimateSection(section)
        }
      })
    }

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
      // Ensure animation triggers after scroll
      setTimeout(() => {
        if (!element.classList.contains("animate-fade-in-up")) {
          element.classList.add("animate-fade-in-up")
        }
        setActiveSection(id)
      }, 500)
    }
    setMobileMenuOpen(false)
  }

  const navigationItems = ["about", "experience", "skills", "education", "github-contributions", "connect"]

  const experience = [
    {
      id: 1,
      year: "2025",
      role: "Software Development Engineer I",
      company: "WizCommerce (Oritur Technologies Pvt Ltd)",
      period: "Sep 2025 — Present",
      description:
        "Developed and maintained Python FastAPI microservices for B2B e-commerce platform. Improved Elasticsearch search with fuzzy search and relevance scoring. Optimized high-traffic APIs reducing latency by 80% and increasing throughput by 35%. Built Payment Terms module with dynamic configurations. Implemented parallelized batch migration pipeline handling 1M+ records at 1000+ docs/sec.",
      tech: ["Python", "FastAPI", "PostgreSQL", "Elasticsearch", "Redis", "AWS"],
    },
    {
      id: 2,
      year: "2025",
      role: "Software Development Engineer I (GenAI)",
      company: "Fynd (Shopsense Retail Technologies Ltd)",
      period: "Feb 2025 — Aug 2025",
      description:
        "Led backend development for Fynix AI coding assistant with IntelliJ and VS Code extensions. Improved codebase indexing by 90%+ through embedding optimization and vector database tuning. Designed modular ETL pipelines for GitHub, GitLab, Azure DevOps, Quip, Google Docs, and BigQuery integration. Engineered large-scale data ingestion for Stack Overflow and public GitHub datasets. Built intelligent workflow using LangChain and LangGraph.",
      tech: ["Python", "Java", "Kotlin", "LangChain", "LangGraph", "Vector DB", "OpenAI", "Claude"],
    },
    {
      id: 3,
      year: "2023",
      role: "Backend Developer (Founding Team)",
      company: "Growder Technovations Pvt. Ltd. & Ompax Lifestyle Pvt. Ltd.",
      period: "Mar 2023 — May 2024",
      description:
        "Engineered high-performance backend architectures across two early-stage B2B platforms using Java, Spring Boot, PostgreSQL/MySQL, and distributed microservice patterns. Designed Order Management System improving throughput by 70-80%. Built production-grade User Management with JWT authentication and RBAC. Developed reusable APIs for Shiprocket, Shopify, and payment gateway integrations. Automated warehouse, logistics, and design workflows reducing manual dependencies significantly. (Both companies discontinued later due to funding constraints.)",
      tech: ["Java", "Spring Boot", "MySQL", "PostgreSQL", "Elasticsearch", "AWS", "RabbitMQ"],
    },
  ]

  const skills = {
    "Programming Languages": ["Python", "Java", "JavaScript", "SQL"],
    "Frameworks & Libraries": [
      "Spring Boot",
      "Spring Framework",
      "FastAPI",
      "JUnit",
      "Pytest",
      "Hibernate",
      "NumPy",
      "Pandas",
      "Matplotlib",
      "Seaborn",
      "SciPy",
      "Scikit-Learn",
      "Apache Spark",
      "LangChain",
      "LangGraph",
    ],
    "Cloud & DevOps": [
      "AWS (S3, EC2, Lambda)",
      "GCP (Cloud SQL, GCS, Cloud Logging)",
      "Docker",
      "Kubernetes",
      "CI/CD",
      "GitHub",
      "Grafana",
      "Prometheus",
      "Sentry",
      "New Relic",
    ],
    "Databases & Messaging": ["PostgreSQL", "MySQL", "Redis", "RabbitMQ", "Kafka", "Elasticsearch", "Kibana"],
    "Software Engineering": [
      "Backend Development",
      "REST APIs",
      "API Gateway",
      "Microservices",
      "SDLC",
      "Low-Level Design",
      "High-Level Design",
      "OOP",
      "Data Structures & Algorithms",
    ],
    "AI & LLM": ["Generative AI", "LLMs", "Prompt Engineering", "AI Agents", "Vector Databases", "RAG", "Embeddings"],
    "Machine Learning": ["Supervised Learning", "Unsupervised Learning", "Feature Engineering", "Model Evaluation"],
    "Data Analysis": ["EDA", "Statistical Analysis", "Tableau", "BigQuery"],
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
      institution: "Birla Institute of Technology, Mesra",
      year: "2020",
    },
    {
      id: 3,
      degree: "Certification",
      field: "Full Stack Web Development",
      institution: "Masai School, Bengaluru",
      year: "2023",
    },
    {
      id: 4,
      degree: "Certification",
      field: "Data Science and Machine Learning",
      institution: "Scaler DSML",
      year: "2025",
    },
  ]

  const socialLinks = [
    { name: "GitHub", handle: "piyush1856", url: "https://github.com/piyush1856", icon: "github" },
    {
      name: "LinkedIn",
      handle: "piyush-tyagi-308930246",
      url: "https://linkedin.com/in/piyush-tyagi-308930246",
      icon: "linkedin",
    },
    { name: "LeetCode", handle: "piyush1856", url: "https://leetcode.com/piyush1856", icon: "code" },
    { name: "Email", handle: "piyushtyagi28@hotmail.com", url: "mailto:piyushtyagi28@hotmail.com", icon: "mail" },
  ]

  const contactInfo = {
    phone: "(+91) 9973061351",
    email: "piyushtyagi28@hotmail.com",
    location: "Bengaluru, Karnataka",
  }

  return (
    <div
      className={`${isDark ? "dark" : ""} min-h-screen bg-background text-foreground transition-colors duration-300`}
    >
      {/* Header/Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-light">Piyush Tyagi</h1>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-8">
            {navigationItems.map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item)}
                className={`text-sm font-light transition-colors capitalize ${
                  activeSection === item ? "text-accent font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.replace("-", " ")}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-4">
            <button onClick={toggleTheme} className="p-2 hover:bg-muted rounded">
              {isDark ? "☀️" : "🌙"}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-muted rounded">
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>

          {/* Theme Toggle Desktop */}
          <button onClick={toggleTheme} className="hidden md:flex p-2 hover:bg-muted rounded">
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border bg-background/95 backdrop-blur">
            <div className="max-w-4xl mx-auto px-4 py-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="block w-full text-left px-4 py-2 rounded hover:bg-muted text-sm capitalize"
                >
                  {item.replace("-", " ")}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24">
        {/* About/Hero Section */}
        <section
          id="about"
          ref={(el) => { sectionsRef.current[0] = el }}
          className="min-h-screen flex items-center py-20 opacity-0"
        >
          <div className="space-y-8 w-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-lg text-accent font-semibold uppercase tracking-widest min-h-[1.5rem] flex items-center">
                  {currentText || " "}
                  <span className="inline-block w-0.5 h-5 bg-accent ml-1 animate-blink" />
                </p>
                <h2 className="text-5xl sm:text-7xl font-light leading-tight">
                  Building efficient,
                  <br />
                  scalable systems
                </h2>
              </div>

              <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed pt-4">
                I specialize in high-performance APIs, distributed systems, and AI-driven backend development. With 2+
                years of experience in Python, Java, and cloud architecture, I build fault-tolerant systems that handle
                scale.
              </p>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-6 text-sm pt-8">
              <a href="tel:+919973061351" className="text-muted-foreground hover:text-accent transition-colors">
                +91 9973061351
              </a>
              <a
                href="mailto:piyushtyagi28@hotmail.com"
                className="text-muted-foreground hover:text-accent transition-colors"
              >
                piyushtyagi28@hotmail.com
              </a>
              <span className="text-muted-foreground">Bengaluru, Karnataka</span>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 pt-4">
              <a
                href="https://github.com/piyush1856"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors text-sm"
              >
                GitHub
              </a>
              <a
                href="https://linkedin.com/in/piyush-tyagi-308930246"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors text-sm"
              >
                LinkedIn
              </a>
              <a
                href="https://leetcode.com/piyush1856"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors text-sm"
              >
                LeetCode
              </a>
            </div>

            {/* Resume Button */}
            <button
              onClick={() =>
                window.open(
                  "https://drive.google.com/file/d/1CJwGnjc5k5p8CZzylUHnbhqSIFoETj2J/view?usp=drive_link",
                  "_blank",
                )
              }
              className="mt-8 px-6 py-3 bg-accent text-accent-foreground rounded hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Open Resume
            </button>
          </div>
        </section>

        {/* Experience Section */}
        <section
          id="experience"
          ref={(el) => { sectionsRef.current[1] = el }}
          className="min-h-screen py-20 sm:py-32 opacity-0"
        >
          <div className="space-y-16">
            <div className="border-b border-border pb-8">
              <h2 className="text-4xl sm:text-5xl font-light">Work Experience</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
                Backend engineering across B2B platforms, AI-driven systems, and high-scale microservices
              </p>
            </div>

            <div className="space-y-12">
              {experience.map((job) => (
                <article key={job.id} className="pb-12 border-b border-border/50 last:border-0 last:pb-0 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-accent font-semibold uppercase tracking-widest">{job.period}</p>
                    <h3 className="text-2xl sm:text-3xl font-semibold">{job.role}</h3>
                    <p className="text-muted-foreground">{job.company}</p>
                  </div>

                  <p className="text-muted-foreground leading-relaxed pt-2 max-w-3xl text-sm sm:text-base">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-4">
                    {job.tech.map((tech) => (
                      <span key={tech} className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                        {tech}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Skills Section */}
        <section id="skills" ref={(el) => { sectionsRef.current[2] = el }} className="py-20 sm:py-32 opacity-0">
          <div className="space-y-16">
            <div className="border-b border-border pb-8">
              <h2 className="text-4xl sm:text-5xl font-light">Skills & Expertise</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
                Deep expertise across backend development, cloud infrastructure, and AI/LLM systems
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">{category}</h3>
                  <ul className="space-y-2">
                    {items.map((skill) => (
                      <li key={skill} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Education Section */}
        <section id="education" ref={(el) => { sectionsRef.current[3] = el }} className="py-20 sm:py-32 opacity-0">
          <div className="space-y-16">
            <div className="border-b border-border pb-8">
              <h2 className="text-4xl sm:text-5xl font-light">Education</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
                Advanced degrees and certifications in Computer Science and Machine Learning
              </p>
            </div>

            <div className="space-y-12">
              {education.map((edu) => (
                <article key={edu.id} className="pb-12 border-b border-border/50 last:border-0 last:pb-0 space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs text-accent font-semibold uppercase tracking-widest">{edu.year}</p>
                    <h3 className="text-2xl sm:text-3xl font-semibold">{edu.degree}</h3>
                    {edu.field && <p className="text-muted-foreground font-medium">{edu.field}</p>}
                    <p className="text-muted-foreground text-sm">{edu.institution}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* GitHub Contributions Section */}
        <section
          id="github-contributions"
          ref={(el) => { sectionsRef.current[4] = el }}
          className="py-20 sm:py-32 opacity-0"
        >
          <div className="space-y-16">
            <div className="border-b border-border pb-8">
              <h2 className="text-4xl sm:text-5xl font-light">GitHub Contributions</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
                Active contributor on GitHub with focus on backend systems and open-source projects
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading GitHub stats...</p>
              </div>
            ) : githubStats ? (
              <div className="space-y-12">
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* First Row */}
                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                      Total Contributions
                    </p>
                    <p className="text-3xl font-semibold text-accent">
                      {additionalStats?.totalContributions?.toLocaleString() || "—"}
                    </p>
                  </div>

                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Current Streak</p>
                    <p className="text-3xl font-semibold text-accent">
                      {additionalStats?.currentStreak ? `${additionalStats.currentStreak} days` : "—"}
                    </p>
                  </div>

                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                      Public Repositories
                    </p>
                    <p className="text-3xl font-semibold text-accent">{githubStats?.public_repos}</p>
                  </div>

                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Total Stars</p>
                    <p className="text-3xl font-semibold text-accent">
                      {additionalStats?.totalStars?.toLocaleString() || "—"}
                    </p>
                  </div>

                  {/* Second Row */}
                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Total Forks</p>
                    <p className="text-3xl font-semibold text-accent">
                      {additionalStats?.totalForks?.toLocaleString() || "—"}
                    </p>
                  </div>

                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Followers</p>
                    <p className="text-3xl font-semibold text-accent">{githubStats?.followers}</p>
                  </div>

                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Following</p>
                    <p className="text-3xl font-semibold text-accent">{githubStats?.following}</p>
                  </div>

                  <div className="p-6 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Member Since</p>
                    <p className="text-lg font-semibold text-accent">
                      {githubStats?.created_at
                        ? new Date(githubStats.created_at).getFullYear()
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Contribution Graph */}
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4 bg-muted/20 overflow-hidden">
                    <img
                      src={`https://github-readme-activity-graph.vercel.app/graph?username=piyush1856&theme=${isDark ? "github-dark" : "minimal"}&hide_border=true&bg_color=transparent&area=true&color=${isDark ? "#a855f7" : "#7c3aed"}&line=${isDark ? "#c084fc" : "#6d28d9"}&point=${isDark ? "#d8b4fe" : "#5b21b6"}`}
                      alt="GitHub Contribution Graph"
                      className="w-full h-auto"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Unable to load GitHub stats</p>
              </div>
            )}
          </div>
        </section>

        {/* Connect Section */}
        <section id="connect" ref={(el) => { sectionsRef.current[5] = el }} className="py-20 sm:py-32 opacity-0">
          <div className="grid lg:grid-cols-2 gap-12 sm:gap-16">
            <div className="space-y-8">
              <h2 className="text-4xl sm:text-5xl font-light">Let's Connect</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                I'm always open to interesting conversations and opportunities. Feel free to reach out about backend
                engineering, system design, or AI-driven development.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Email</p>
                  <a
                    href="mailto:piyushtyagi28@hotmail.com"
                    className="text-foreground hover:text-accent transition-colors"
                  >
                    piyushtyagi28@hotmail.com
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Phone</p>
                  <a href="tel:+919973061351" className="text-foreground hover:text-accent transition-colors">
                    +91 9973061351
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Location</p>
                  <p className="text-foreground">Bengaluru, Karnataka</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Social & Professional</p>
                <div className="flex flex-col gap-3">
                  <a
                    href="https://github.com/piyush1856"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-accent transition-colors text-sm"
                  >
                    → GitHub
                  </a>
                  <a
                    href="https://linkedin.com/in/piyush-tyagi-308930246"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-accent transition-colors text-sm"
                  >
                    → LinkedIn
                  </a>
                  <a
                    href="https://leetcode.com/piyush1856"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-accent transition-colors text-sm"
                  >
                    → LeetCode
                  </a>
                </div>
              </div>

              <div className="pt-8 border-t border-border">
                <p className="text-xs text-muted-foreground">© 2025 Piyush Tyagi. All rights reserved.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
