// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        trex: {
          navy: "var(--trex-navy)",
          blue: "var(--trex-blue)",
          blue2: "var(--trex-blue-2)",
          bg: "var(--bg)",
          card: "var(--card)",
          text: "var(--text)",
          muted: "var(--muted)",
          border: "var(--border)",
        },
      },
      boxShadow: {
        trex: "0 10px 30px rgba(31,55,99,0.10)",
      },
    },
  },
};