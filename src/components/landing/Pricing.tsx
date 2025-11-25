import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "$49",
    description: "Perfect for small teams and side projects",
    features: [
      "Up to 100K requests/month",
      "7-day log retention",
      "Basic incident detection",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$199",
    description: "For growing production applications",
    features: [
      "Up to 1M requests/month",
      "30-day log retention",
      "AI-powered RCA",
      "Auto-remediation",
      "Slack integration",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large-scale deployments",
    features: [
      "Unlimited requests",
      "Custom log retention",
      "Advanced analytics",
      "Dedicated support",
      "SLA guarantees",
      "Custom integrations",
    ],
  },
];

export function Pricing() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold">
            Simple, <span className="text-gradient">transparent pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Start free, scale as you grow. No hidden fees.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={plan.name}
              className={`p-8 glass hover-glow transition-all duration-300 hover:-translate-y-1 animate-scale-in ${
                plan.popular ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {plan.popular && (
                <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold mb-4">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gradient">{plan.price}</span>
                {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
              </div>
              <p className="text-muted-foreground mb-6">{plan.description}</p>
              
              <Button className="w-full mb-6" variant={plan.popular ? "default" : "outline"} asChild>
                <Link to="/register">Get Started</Link>
              </Button>
              
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
