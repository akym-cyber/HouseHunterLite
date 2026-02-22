import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#90ceff",
          400: "#5cb1ff",
          500: "#2f8fff",
          600: "#1d72f3",
          700: "#175cde",
          800: "#184bb4",
          900: "#1a428d"
        }
      },
      maxWidth: {
        app: "1280px"
      }
    }
  },
  plugins: []
};

export default config;

