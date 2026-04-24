import dmSansLatin400Woff2 from "@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2?url";
import dmSansLatin500Woff2 from "@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2?url";
import playfairLatin900Woff2 from "@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff2?url";

const hrefs = [dmSansLatin400Woff2, dmSansLatin500Woff2, playfairLatin900Woff2];

for (const href of hrefs) {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff2";
  link.crossOrigin = "";
  link.href = href;
  document.head.appendChild(link);
}
