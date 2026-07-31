import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

/**
 * next/image refuses any origin it has not been told about. Product images come
 * from the API while STORAGE_DRIVER=local, and from the R2 bucket once that is
 * switched — either way the host is whatever NEXT_PUBLIC_MEDIA_URL points at.
 */
const media = new URL(process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:5000")

const nextConfig: NextConfig = {
	reactCompiler: true,
	images: {
		remotePatterns: [
			{
				protocol: media.protocol.replace(":", "") as "http" | "https",
				hostname: media.hostname,
				port: media.port,
				pathname: "/**",
			},
		],
	},
}

export default withNextIntl(nextConfig)
