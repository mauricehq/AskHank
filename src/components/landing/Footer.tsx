import { Mail } from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Logo + tagline */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/AskHankIcon.svg" alt="" width={24} height={24} />
              <span className="font-bold text-lg text-text">
                Ask <span className="text-accent">Hank</span>
              </span>
            </div>
            <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
              Tell him what you want to buy. He pushes back.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-text font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a href="#demo" className="hover:text-accent transition-colors">Demo</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-accent transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-accent transition-colors">Pricing</a>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-text font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a href="/terms" className="hover:text-accent transition-colors">Terms of Service</a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="mailto:hello@askhank.app" className="hover:text-accent transition-colors">Contact</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-text-secondary text-sm">
            &copy; {new Date().getFullYear()} AskHank
          </div>
          <a
            href="mailto:hello@askhank.app"
            aria-label="Contact us via email"
            className="text-text-secondary hover:text-text transition-colors"
          >
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
