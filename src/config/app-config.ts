import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Sapphire611's CMS",
  version: packageJson.version,
  copyright: `© ${currentYear} Sapphire611`,
  meta: {
    title: "Sapphire611's CMS",
    description: "Test..",
  },
};
