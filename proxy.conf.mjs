// The dev server forwards /api to the Naucto backend, as nginx does in production.
// NAUCTO_API points it elsewhere, e.g. http://host.docker.internal:3000 from inside a container.
export default {
  '/api': {
    target: process.env.NAUCTO_API ?? 'http://localhost:3000',
    pathRewrite: { '^/api': '' },
    changeOrigin: true,
  },
};
