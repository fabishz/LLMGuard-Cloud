import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      
      {/* Animated orbs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-5xl mx-auto space-y-8 animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Observability Platform</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="block text-foreground">AI Observability &</span>
            <span className="block text-gradient mt-2">Auto-Remediation</span>
            <span className="block text-foreground mt-2">for LLM Apps</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Monitor, detect, and fix AI incidents instantly with OpenAI-powered Root Cause Analysis and automated remediation.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="lg" className="group text-lg h-14 px-8 hover-glow" asChild>
              <Link to="/register">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8 glass" asChild>
              <Link to="/login">
                <Zap className="mr-2 h-5 w-5" />
                Book Demo
              </Link>
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">{'<'}50ms</div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">10M+</div>
              <div className="text-sm text-muted-foreground">Requests/Day</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
