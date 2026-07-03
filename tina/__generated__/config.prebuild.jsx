// tina/config.tsx
import {
  UsernamePasswordAuthJSProvider,
  TinaUserCollection
} from "tinacms-authjs/dist/tinacms";
import { defineConfig, LocalAuthProvider } from "tinacms";

// tina/collections/site.ts
var SiteCollection = {
  name: "site",
  label: "Website-Inhalte",
  path: process.env.CONTENT_PATH || "content",
  format: "json",
  ui: { allowedActions: { create: false, delete: false } },
  fields: [
    // --- Global / brand ---
    { type: "string", name: "brand", label: "Marke (Name)" },
    { type: "image", name: "logo", label: "Logo" },
    { type: "string", name: "logoAlt", label: "Logo Alt-Text" },
    { type: "image", name: "favicon", label: "Favicon" },
    {
      type: "object",
      name: "nav",
      label: "Navigation",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item?.label })
      },
      fields: [
        { type: "string", name: "label", label: "Label" },
        { type: "string", name: "href", label: "Link (href)" }
      ]
    },
    { type: "string", name: "footerNote", label: "Footer-Hinweis" },
    // --- hero ---
    {
      type: "object",
      name: "hero",
      label: "Hero",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "string",
          name: "subtitle",
          label: "Untertitel",
          ui: { component: "textarea" }
        },
        { type: "string", name: "ctaLabel", label: "CTA Label" },
        { type: "string", name: "ctaHref", label: "CTA Link (href)" },
        { type: "image", name: "image", label: "Bild" },
        { type: "string", name: "imageAlt", label: "Bild Alt-Text" }
      ]
    },
    // --- logos ---
    {
      type: "object",
      name: "logos",
      label: "Partner-Logos",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "items",
          label: "Logos",
          list: true,
          ui: {
            itemProps: (item) => ({ label: item?.alt })
          },
          fields: [
            { type: "image", name: "src", label: "Bild" },
            { type: "string", name: "alt", label: "Alt-Text" }
          ]
        }
      ]
    },
    // --- services ---
    {
      type: "object",
      name: "services",
      label: "Leistungen",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "items",
          label: "Leistungen",
          list: true,
          ui: {
            itemProps: (item) => ({ label: item?.title })
          },
          fields: [
            { type: "string", name: "title", label: "Titel" },
            {
              type: "string",
              name: "description",
              label: "Beschreibung",
              ui: { component: "textarea" }
            }
          ]
        }
      ]
    },
    // --- stats ---
    {
      type: "object",
      name: "stats",
      label: "Statistiken",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "items",
          label: "Kennzahlen",
          list: true,
          ui: {
            itemProps: (item) => ({ label: item?.label })
          },
          fields: [
            { type: "string", name: "value", label: "Wert" },
            { type: "string", name: "label", label: "Beschriftung" }
          ]
        }
      ]
    },
    // --- cases ---
    {
      type: "object",
      name: "cases",
      label: "Case Studies",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "items",
          label: "Cases",
          list: true,
          ui: {
            itemProps: (item) => ({ label: item?.client })
          },
          fields: [
            { type: "string", name: "client", label: "Kunde" },
            { type: "string", name: "metric", label: "Kennzahl" },
            {
              type: "string",
              name: "situation",
              label: "Ausgangslage",
              list: true
            },
            {
              type: "string",
              name: "result",
              label: "Ergebnis",
              list: true
            },
            { type: "image", name: "logo", label: "Logo" },
            { type: "string", name: "logoAlt", label: "Logo Alt-Text" },
            { type: "image", name: "image", label: "Bild" },
            { type: "string", name: "imageAlt", label: "Bild Alt-Text" },
            { type: "string", name: "href", label: "Link (href)" }
          ]
        }
      ]
    },
    // --- about ---
    {
      type: "object",
      name: "about",
      label: "\xDCber uns",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "string",
          name: "paragraphs",
          label: "Abs\xE4tze",
          list: true,
          ui: { component: "textarea" }
        }
      ]
    },
    // --- people ---
    {
      type: "object",
      name: "people",
      label: "Team",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "items",
          label: "Personen",
          list: true,
          ui: {
            itemProps: (item) => ({ label: item?.name })
          },
          fields: [
            { type: "string", name: "name", label: "Name" },
            { type: "string", name: "role", label: "Rolle" },
            { type: "image", name: "image", label: "Bild" },
            { type: "string", name: "imageAlt", label: "Bild Alt-Text" }
          ]
        }
      ]
    },
    // --- testimonials ---
    {
      type: "object",
      name: "testimonials",
      label: "Referenzen",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "items",
          label: "Zitate",
          list: true,
          ui: {
            itemProps: (item) => ({ label: item?.author })
          },
          fields: [
            {
              type: "string",
              name: "quote",
              label: "Zitat",
              ui: { component: "textarea" }
            },
            { type: "string", name: "author", label: "Autor" },
            { type: "string", name: "role", label: "Rolle" }
          ]
        }
      ]
    },
    // --- cta ---
    {
      type: "object",
      name: "cta",
      label: "Abschluss-CTA",
      fields: [
        { type: "string", name: "title", label: "Titel" },
        {
          type: "string",
          name: "subtitle",
          label: "Untertitel",
          ui: { component: "textarea" }
        },
        { type: "string", name: "ctaLabel", label: "CTA Label" },
        { type: "string", name: "ctaHref", label: "CTA Link (href)" }
      ]
    },
    // --- map ---
    {
      type: "object",
      name: "map",
      label: "Standort",
      fields: [
        { type: "string", name: "title", label: "Titel" },
        { type: "string", name: "address", label: "Adresse" }
      ]
    },
    // --- contact ---
    {
      type: "object",
      name: "contact",
      label: "Kontakt",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        { type: "string", name: "email", label: "E-Mail" },
        { type: "string", name: "phone", label: "Telefon" },
        { type: "string", name: "address", label: "Adresse" }
      ]
    },
    // --- process ---
    {
      type: "object",
      name: "process",
      label: "Ablauf",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "steps",
          label: "Schritte",
          list: true,
          ui: { itemProps: (item) => ({ label: item?.title }) },
          fields: [
            { type: "string", name: "title", label: "Titel" },
            { type: "string", name: "description", label: "Beschreibung", ui: { component: "textarea" } }
          ]
        }
      ]
    },
    // --- faq ---
    {
      type: "object",
      name: "faq",
      label: "FAQ",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "items",
          label: "Fragen",
          list: true,
          ui: { itemProps: (item) => ({ label: item?.q }) },
          fields: [
            { type: "string", name: "q", label: "Frage" },
            { type: "string", name: "a", label: "Antwort", ui: { component: "textarea" } }
          ]
        }
      ]
    },
    // --- gallery ---
    {
      type: "object",
      name: "gallery",
      label: "Galerie",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "images",
          label: "Bilder",
          list: true,
          ui: { itemProps: (item) => ({ label: item?.alt }) },
          fields: [
            { type: "image", name: "src", label: "Bild" },
            { type: "string", name: "alt", label: "Alt-Text" }
          ]
        }
      ]
    },
    // --- pricing ---
    {
      type: "object",
      name: "pricing",
      label: "Preise",
      fields: [
        { type: "string", name: "eyebrow", label: "Eyebrow" },
        { type: "string", name: "title", label: "Titel" },
        {
          type: "object",
          name: "plans",
          label: "Pakete",
          list: true,
          ui: { itemProps: (item) => ({ label: item?.name }) },
          fields: [
            { type: "string", name: "name", label: "Name" },
            { type: "string", name: "price", label: "Preis" },
            { type: "string", name: "features", label: "Features", list: true }
          ]
        }
      ]
    }
  ]
};

// tina/config.tsx
var isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";
var config_default = defineConfig({
  authProvider: isLocal ? new LocalAuthProvider() : new UsernamePasswordAuthJSProvider(),
  contentApiUrlOverride: "/api/tina/gql",
  build: {
    publicFolder: "public",
    outputFolder: "admin"
  },
  media: {
    tina: {
      mediaRoot: "assets",
      publicFolder: process.env.CONTENT_PUBLIC_FOLDER || "src/clients/blessing-marketing-od"
    }
  },
  schema: {
    collections: [TinaUserCollection, SiteCollection]
  }
});
export {
  config_default as default
};
