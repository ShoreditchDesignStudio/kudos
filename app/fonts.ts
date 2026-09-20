import localFont from "next/font/local";

// Switzer (Fontshare) loaded for the browser — the variable cut, so one
// 44 KB file covers the whole 100–900 weight range rather than shipping a
// separate file per weight. Same licence family as Cabinet Grotesk below;
// see public/fonts/Switzer-LICENSE.txt.
//
// The Satori slide renderer (lib/render/fonts.ts) reads Cabinet Grotesk OTFs
// directly from public/fonts/ and is independent of this loader — changing
// the interface font does not change the rendered slides.
//
// To fall back to Satoshi: swap src to the three Satoshi-*.otf files (each
// with its own weight), rename the variable, and update --font-sans in
// app/globals.css.
export const switzer = localFont({
  src: [
    {
      path: "../public/fonts/Switzer-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-switzer",
  display: "swap",
});
