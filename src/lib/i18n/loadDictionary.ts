import { load } from "js-yaml";

const files = import.meta.glob("../../locales/*.yml", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const loadDictionary = async (lang: string) => {
  const path = `../../locales/${lang}.yml`;
  const file = files[path];

  if (!file) {
    // eslint-disable-next-line no-console
    console.warn(`No dictionary found for lang: "${lang}"`);
    return {};
  }

  return load(file as string) as Record<string, unknown>;
};
