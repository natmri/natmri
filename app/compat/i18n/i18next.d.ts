// import the original type declarations
import "i18next";
// import all namespaces (for the default language, only)
import en_common from "./locales/en/common.json";
import cn_common from "./locales/cn/common.json";

declare module "i18next" {
  // Extend CustomTypeOptions
  interface CustomTypeOptions {
    // custom namespace type, if you changed it
    defaultNS: "ns1";
    // custom resources type
    resources: {
      en: {
        common: typeof en_common
      };
      cn: {
        common: typeof cn_common
      }
    };
    // other
  }
}
