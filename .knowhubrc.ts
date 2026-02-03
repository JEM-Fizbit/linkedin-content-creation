import type { Config } from "knowhub";

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/JEM-Fizbit/ai-knowledge/main/protocols";

const config: Config = {
  resources: [
    // Gemini Image Generation
    {
      plugin: "http",
      pluginConfig: { url: `${GITHUB_RAW_BASE}/GEMINI_IMAGE_GENERATION.md` },
      overwrite: true,
      outputs: ["docs/protocols/GEMINI_IMAGE_GENERATION.md"],
    },
    // Git Conventions
    {
      plugin: "http",
      pluginConfig: { url: `${GITHUB_RAW_BASE}/GIT_CONVENTIONS.md` },
      overwrite: true,
      outputs: ["docs/protocols/GIT_CONVENTIONS.md"],
    },
  ],
};

export default config;
