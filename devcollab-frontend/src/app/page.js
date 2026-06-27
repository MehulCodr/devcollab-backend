"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  Sparkles, 
  Network, 
  Building2, 
  ShieldCheck,
  CheckCircle2,
  FolderKanban,
  Activity,
  ArrowRight
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, authLoading } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email: form.email, password: form.password });
      router.push("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
          <p className="text-slate-400 font-medium tracking-wide">Checking session...</p>
        </div>
      </main>
    );
  }

  const features = [
    { icon: Users, title: "Real-Time Collaboration", desc: "Work together seamlessly across timezones." },
    { icon: Sparkles, title: "AI Workspace", desc: "Intelligent insights and automated documentation." },
    { icon: Network, title: "Smart Matching", desc: "Find the right developers for your projects." },
    { icon: Building2, title: "Organization Management", desc: "Centralized control for teams and resources." },
    { icon: ShieldCheck, title: "Secure Authentication", desc: "Enterprise-grade security and role management." }
  ];

  const stats = [
    { label: "Organizations Created", value: "1,204", prefix: "+" },
    { label: "Projects Managed", value: "8,532", prefix: "" },
    { label: "Tasks Completed", value: "45K", prefix: "+" },
    { label: "Developers Connected", value: "12K", prefix: "" }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row font-sans">
      
      {/* Left Side - Hero Section (approx 65%) */}
      <section className="hidden lg:flex lg:w-[65%] relative overflow-hidden bg-slate-900 border-r border-slate-800 flex-col">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-12 overflow-y-auto custom-scrollbar">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="font-bold text-white text-xl leading-none">D</span>
            </div>
            <span className="font-bold text-xl tracking-tight">DevCollaborator</span>
          </div>

          {/* Hero Content */}
          <div className="max-w-2xl mb-12">
            <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Build. Collaborate.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Ship Faster.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              The ultimate workspace OS for modern engineering teams. Bring your projects, tasks, and developers together in one intelligent, unified platform.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-6 mb-16 border-y border-slate-800/50 py-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-3xl font-bold text-white mb-1">
                  {stat.prefix}{stat.value}
                </span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-12">
            {/* Features List */}
            <div className="flex-1 space-y-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Platform Features</h3>
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4 group">
                  <div className="p-2.5 rounded-xl bg-slate-800/50 text-blue-400 border border-slate-700/50 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-colors">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1">{feature.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Preview Card */}
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-2xl transform rotate-3 scale-105 border border-slate-700/50 blur-[2px]" />
              <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center">
                      <FolderKanban className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Frontend Migration</h4>
                      <p className="text-xs text-slate-500">Acme Corp</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider">In Progress</span>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-300">Update navigation</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 border border-slate-700">SJ</div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-slate-500 line-through">Design system setup</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 border border-slate-700">MD</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-slate-400">High Activity</span>
                  </div>
                  <span className="text-xs font-medium text-blue-400 flex items-center gap-1 cursor-pointer hover:text-blue-300">
                    View Project <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* Right Side - Login Form (approx 35%) */}
      <section className="w-full lg:w-[35%] flex flex-col justify-center bg-slate-950 p-8 sm:p-12 lg:p-16 relative z-20 shadow-2xl">
        <div className="w-full max-w-sm mx-auto">
          
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="font-bold text-white text-xl leading-none">D</span>
            </div>
            <span className="font-bold text-xl tracking-tight">DevCollaborator</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-2">
              Enter your credentials to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={form.rememberMe}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 rounded border border-slate-600 bg-slate-900 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors" />
                  <CheckCircle2 className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
              </label>
              
              <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all mt-2 shadow-lg shadow-blue-500/20"
            >
              {loading ? "Signing in..." : "Sign in to Workspace"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Sign up for free
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}