import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "INFP的小窝",
  version: packageJson.version,
  copyright: `© ${currentYear} INFP`,
  meta: {
    title: "INFP CMS",
    description: "INFP的小窝 - 内容管理系统",
  },
};
