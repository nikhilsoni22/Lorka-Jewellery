/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lorka/types'],
  async rewrites() {
    // Serves Firebase's Google sign-in handler from this site's own domain, so the popup shows
    // our address instead of "<project>.firebaseapp.com". Takes effect once
    // NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set to this site's domain (production only — keep the
    // firebaseapp.com value locally, since the handler must be served over https).
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!project) return [];
    return [
      { source: '/__/auth/:path*', destination: `https://${project}.firebaseapp.com/__/auth/:path*` },
      { source: '/__/firebase/:path*', destination: `https://${project}.firebaseapp.com/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
