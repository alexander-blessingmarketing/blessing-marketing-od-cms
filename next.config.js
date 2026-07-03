module.exports = {
  transpilePackages: [
    "tinacms",
    "tinacms-authjs",
    "@tinacms/datalayer",
    "tinacms-gitprovider-github",
  ],
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/admin",
          destination: "/admin/index.html",
        },
      ],
      // fallback runs only for paths that would otherwise 404 — AFTER the admin's own
      // static chunks under /admin/assets/*.js|css are served. Image fields store the
      // Astro-relative value "assets/<file>", which the admin resolves to
      // /admin/assets/<file> (404) → rewrite it (and any root-absolute /assets/<file>)
      // to the git-backed asset route so editor previews load. Stored value unchanged.
      fallback: [
        {
          source: "/admin/assets/:path*",
          destination: "/api/assets/:path*",
        },
        {
          source: "/assets/:path*",
          destination: "/api/assets/:path*",
        },
      ],
    };
  },
};
