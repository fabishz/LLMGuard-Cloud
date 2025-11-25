import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-gradient">LLMGuard</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              AI Observability & Auto-Remediation for production LLM applications.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Documentation</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Careers</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          © 2025 LLMGuard Cloud. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
