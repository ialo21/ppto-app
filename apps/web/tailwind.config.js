/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#b6d6ff",
          300: "#84b6ff",
          400: "#4a8dff",
          500: "#1e6fff",
          600: "#1457db",
          700: "#1447ad",
          800: "#153d85",
          900: "#15346a"
        }
      },
      borderRadius: {
        "2xl": "1rem"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,.08)"
      }
    }
  },
  plugins: []
}
