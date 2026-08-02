import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Footer } from "@/components/Footer";
import { SafeGoLogoAnimated } from "@/components/SafeGoLogoAnimated";
import { Users, Code, Layout, Database, Shield, Zap, Heart } from "lucide-react";

const team = [
  {
    name: "Laya",
    role: "Team Leader & Backend Architect",
    desc: "Orchestrating the vision and ensuring high-performance server-side logic for seamless reliability.",
    icon: Shield,
    color: "bg-pink-500",
    shadow: "shadow-pink-500/20",
    delay: "delay-100"
  },
  {
    name: "Madhan",
    role: "Full-Stack Designer",
    desc: "Bridging the gap between robust backend systems and beautiful, intuitive frontend interfaces.",
    icon: Zap,
    color: "bg-teal-500",
    shadow: "shadow-teal-500/20",
    delay: "delay-200"
  },
  {
    name: "Harshitha Reddy",
    role: "Frontend Specialist",
    desc: "Crafting the pixel-perfect, high-fidelity UI/UX that makes SafeGo a premium experience.",
    icon: Layout,
    color: "bg-purple-500",
    shadow: "shadow-purple-500/20",
    delay: "delay-300"
  },
  {
    name: "Sai Inapakolla",
    role: "Database Architect & Quality Assurance",
    desc: "Designing scalable data schemas and rigorously testing every feature for peak performance.",
    icon: Database,
    color: "bg-blue-500",
    shadow: "shadow-blue-500/20",
    delay: "delay-400"
  },
  {
    name: "Pallavi",
    role: "Project Structure Planner",
    desc: "Defining the architectural roadmap and ensuring the codebase remains organized and scalable.",
    icon: Code,
    color: "bg-amber-500",
    shadow: "shadow-amber-500/20",
    delay: "delay-500"
  }
];

const About = () => {
  const navigate = useNavigate();
  const revealRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-background flex flex-col" ref={revealRef}>
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
            <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1px)', backgroundSize: '32px 32px' }} />
          </div>

          <div className="container mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4">
              <Users size={14} />
              About the Team
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              The Minds Behind <span className="text-primary">SafeGo</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
              SafeGo is more than just an app; it's a mission to redefine safety and accessibility in transportation. Meet the dedicated team driving this innovation forward.
            </p>
          </div>
        </section>

        {/* Company Mission */}
        <section className="py-24 bg-secondary/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 scroll-reveal-left">
                <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                  Our <span className="text-primary italic">Vision</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                  Founded on the principle of inclusive safety, SafeGo aims to provide a secure environment for every passenger, regardless of their needs. Whether it's our Pink Mode for women, PWD Mode for accessibility, or Elderly Mode for specialized care, we build with empathy and cutting-edge technology.
                </p>
                <div className="flex flex-wrap gap-4 pt-6">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-background border border-border shadow-sm hover:shadow-md hover:border-pink-500/30 transition-all duration-300 group">
                    <Heart size={20} className="text-pink-500 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-black uppercase tracking-wider">Empathy First</span>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-background border border-border shadow-sm hover:shadow-md hover:border-teal-500/30 transition-all duration-300 group">
                    <Shield size={20} className="text-teal-500 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-black uppercase tracking-wider">Safety First</span>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-background border border-border shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all duration-300 group">
                    <Zap size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-black uppercase tracking-wider">Agile Tech</span>
                  </div>
                </div>
              </div>
              <div className="relative scroll-reveal-right">
                <div className="aspect-video rounded-[3rem] overflow-hidden premium-shadow relative group border border-border/50 bg-secondary/30">
                  {/* The Teamwork Vision Image */}
                  <img
                    src="/safego_teamwork_vision.webp"
                    alt="SafeGo Team Collaboration"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  {/* Glassmorphic Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />


                  {/* Decorative Tag */}
                  <div className="absolute bottom-8 left-8 flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Innovation Hub</span>
                  </div>
                </div>

                {/* Exterior Glows */}
                <div className="absolute -top-12 -right-12 h-40 w-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-12 -left-12 h-40 w-40 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-700" />
              </div>
            </div>
          </div>
        </section>

        {/* Team Grid */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20 scroll-reveal">
              <h2 className="text-5xl font-black text-foreground mb-4 tracking-tighter">Core Team</h2>
              <div className="h-2 w-32 bg-primary mx-auto rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
            </div>

            <div className="relative">
              {/* Team Interconnect Background (SVG Lines) */}
              <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden lg:block">
                <svg width="100%" height="100%" className="opacity-20">
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Horizontal Connections */}
                  <path d="M 15% 25% L 85% 25%" stroke="url(#lineGrad)" strokeWidth="1" fill="none" className="animate-pulse" />
                  <path d="M 15% 75% L 85% 75%" stroke="url(#lineGrad)" strokeWidth="1" fill="none" className="animate-pulse" style={{ animationDelay: '1s' }} />

                  {/* Pulse Dots on Lines */}
                  <circle r="2" fill="hsl(var(--primary))">
                    <animateMotion dur="4s" repeatCount="indefinite" path="M 15% 25% L 85% 25%" />
                  </circle>
                  <circle r="2" fill="hsl(var(--primary))">
                    <animateMotion dur="5s" repeatCount="indefinite" path="M 85% 75% L 15% 75%" />
                  </circle>
                </svg>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                {team.map((member, i) => (
                  <div key={member.name} className="group relative scroll-reveal-zoom">
                    <div className={`absolute -inset-1 rounded-[2.5rem] ${member.color} opacity-0 blur-2xl group-hover:opacity-20 transition duration-700`} />
                    <div className="relative h-full flex flex-col p-8 rounded-[2rem] border border-border bg-background/80 backdrop-blur-sm hover:border-primary/50 hover:-translate-y-4 transition-all duration-500 premium-shadow overflow-hidden">
                      {/* Animated Border Gradient */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
                      </div>
                      {/* Background Glow */}
                      <div className={`absolute -right-10 -top-10 w-32 h-32 ${member.color} opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />

                      <div className={`w-16 h-16 rounded-2xl ${member.color} ${member.shadow} flex items-center justify-center text-white mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative z-10 animate-float`} style={{ animationDelay: `${i * 0.2}s` }}>
                        <member.icon size={32} />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-2xl font-black text-foreground mb-1 group-hover:text-primary transition-colors">{member.name}</h3>
                        <p className="text-xs font-black uppercase tracking-widest text-primary/70 mb-4">{member.role}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {member.desc}
                        </p>
                      </div>

                      <div className="mt-auto pt-8 flex items-center gap-3 relative z-10">
                        <div className="h-[2px] flex-1 bg-border/50 group-hover:bg-primary/20 transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">SafeGo Core</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="rounded-[3rem] bg-foreground p-12 text-center text-background relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <h2 className="text-3xl md:text-5xl font-black mb-6 relative z-10">We're just getting started.</h2>
              <p className="text-background/70 max-w-xl mx-auto mb-4 relative z-10 italic">
                "Our mission is to ensure that no passenger ever feels unsafe during their journey. Every line of code we write is a step toward a safer tomorrow."
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
