import { Activity, DollarSign, Sparkles, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Activity,
    title: "LLM Monitoring",
    description: "Real-time monitoring of all LLM requests with latency tracking, token usage, and error detection across all models.",
  },
  {
    icon: DollarSign,
    title: "Cost Tracking",
    description: "Comprehensive cost analytics per model, user, and endpoint. Optimize your AI spend with detailed breakdowns.",
  },
  {
    icon: Sparkles,
    title: "Incident RCA",
    description: "AI-powered Root Cause Analysis identifies issues instantly. Get OpenAI-generated insights for every incident.",
  },
  {
    icon: Wrench,
    title: "Auto-Fix Engine",
    description: "Automated remediation applies recommended fixes. Resolve incidents before they impact your users.",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold">
            Everything you need to <span className="text-gradient">monitor AI</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Comprehensive observability and intelligent automation for production LLM applications
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="p-6 glass hover-glow transition-all duration-300 hover:-translate-y-1 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
