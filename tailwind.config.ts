import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8fe",
          200: "#bfd4fd",
          300: "#93b6fb",
          400: "#6090f6",
          500: "#3b6cef",
          600: "#2550e3",
          700: "#1d3fc8",
          800: "#1e35a2",
          900: "#1e2f7f",
          950: "#141d4d",
        },
        luxury: {
          navy: "#0f172a",
          slate: "#1e293b",
          charcoal: "#334155",
          gold: "#c9a227",
          "gold-soft": "#e8d5a3",
          cyan: "#22d3ee",
          pearl: "#f8fafc",
          mist: "#f1f5f9",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f6fa",
          border: "#e2e8f0",
          glass: "rgba(255, 255, 255, 0.72)",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 12px -2px rgb(15 23 42 / 0.06)",
        elevated:
          "0 8px 24px -4px rgb(15 23 42 / 0.08), 0 4px 8px -4px rgb(15 23 42 / 0.04)",
        premium:
          "0 0 0 1px rgb(226 232 240 / 0.8), 0 12px 32px -8px rgb(15 23 42 / 0.12)",
        "premium-lg":
          "0 0 0 1px rgb(37 80 227 / 0.1), 0 20px 48px -12px rgb(15 23 42 / 0.16)",
        glow: "0 0 0 1px rgb(37 80 227 / 0.08), 0 8px 32px -8px rgb(37 80 227 / 0.2)",
        "inner-soft": "inset 0 1px 0 0 rgb(255 255 255 / 0.6)",
      },
      backgroundImage: {
        "app-gradient":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgb(37 80 227 / 0.08), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgb(34 211 238 / 0.05), transparent), linear-gradient(180deg, #f4f6fa 0%, #eef2f7 100%)",
        "luxury-dark":
          "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #172554 100%)",
        "luxury-mesh":
          "radial-gradient(at 40% 20%, rgb(37 80 227 / 0.35) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(34 211 238 / 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgb(201 162 39 / 0.12) 0px, transparent 50%), linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        "stat-icon": "linear-gradient(135deg, rgb(37 80 227 / 0.12) 0%, rgb(34 211 238 / 0.08) 100%)",
        "gradient-border":
          "linear-gradient(135deg, rgb(37 80 227 / 0.4), rgb(34 211 238 / 0.3), rgb(201 162 39 / 0.2))",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.45s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "pulse-slow": "pulseSlow 6s ease-in-out infinite",
        float: "float 8s ease-in-out infinite",
        "grid-drift": "gridDrift 24s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        float: {
          "0%, 100%": { transform: "translate(-50%, 0)" },
          "50%": { transform: "translate(-50%, -12px)" },
        },
        gridDrift: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(48px, 48px)" },
        },
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
