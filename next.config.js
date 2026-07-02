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
    return [
      {
        source: "/admin",
        destination: "/admin/index.html",
      },
    ];
  },
};
