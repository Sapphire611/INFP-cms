import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "雷式幼儿园",
  version: packageJson.version,
  copyright: `© ${currentYear} JXRAYS`,
  meta: {
    title: "JXRAYS",
    description: "JXRAYS..",
  },
};
