/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Trade ledger" palette: deep indigo (nods to adire/indigo-dye
        // textile trade) as the structural color, warm ochre as the one
        // accent (money, approvals, primary actions), canvas as a warm
        // off-white rather than pure white or a grey SaaS background.
        ink: {
          DEFAULT: "#14213D",
          50: "#EEF1F6",
          100: "#D6DCE9",
          200: "#AEB9D2",
          300: "#8695BA",
          400: "#4F5F8F",
          500: "#14213D",
          600: "#101B32",
          700: "#0C1526",
          800: "#080E1A",
          900: "#04070D",
        },
        canvas: "#F7F5F0",
        paper: "#FFFCF6",
        ochre: {
          DEFAULT: "#C98A2C",
          50: "#FBF3E7",
          100: "#F3DFB9",
          400: "#D69A3E",
          500: "#C98A2C",
          600: "#A66F1F",
          700: "#7D5417",
        },
        moss: {
          DEFAULT: "#3F7D58",
          50: "#EAF4EE",
          500: "#3F7D58",
          700: "#2C5A3F",
        },
        brick: {
          DEFAULT: "#B33F3F",
          50: "#FBEDED",
          500: "#B33F3F",
          700: "#832C2C",
        },
        muted: "#6B6458",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};
