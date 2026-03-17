"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Demo", href: "#demo" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-bg/90 backdrop-blur-md border-b border-border py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-text-secondary hover:text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none rounded-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2"
          >
            <Image src="/AskHankIcon.svg" alt="" width={24} height={24} />
            <span className="font-bold text-lg text-text">
              Ask <span className="text-accent">Hank</span>
            </span>
          </a>
        </div>

        {/* Center: desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-link-underline text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: auth buttons (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/conversations">
              <button className="rounded-[10px] border border-border bg-transparent px-4 py-2 text-sm font-medium text-text hover:bg-bg-surface transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/conversations">
              <button className="rounded-[10px] bg-accent px-4 py-2 text-sm font-medium text-user-text hover:bg-accent-hover transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                Try it free
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/conversations"
              className="rounded-[10px] bg-accent px-4 py-2 text-sm font-medium text-user-text hover:bg-accent-hover transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Open Hank
            </Link>
          </Show>
        </div>

        {/* Right: mobile auth — CTA button visible, sign in goes in hamburger menu */}
        <div className="md:hidden flex items-center">
          <Show when="signed-out">
            <SignUpButton mode="modal" forceRedirectUrl="/conversations">
              <button className="rounded-[10px] bg-accent px-4 py-1.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                Try it free
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/conversations"
              className="rounded-[10px] bg-accent px-4 py-1.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Open Hank
            </Link>
          </Show>
        </div>
      </div>

      {/* Mobile slide-in menu */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-bg-surface border-b border-border overflow-hidden transition-all duration-300 ease-out ${
          mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0 pointer-events-none border-b-0"
        }`}
      >
        <div className="p-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-text-secondary hover:text-text font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <hr className="border-border" />
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/conversations">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="border border-border bg-transparent text-text px-4 py-3 rounded-[10px] font-bold text-center hover:bg-bg transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </nav>
  );
}
