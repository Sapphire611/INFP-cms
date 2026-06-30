import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Sapphire Studio",
  version: packageJson.version,
  copyright: `© ${currentYear} Sapphire611`,
  meta: {
    title: "Sapphire Studio",
    description: "Sapphire Studio - AI 工作站",
  },
};
