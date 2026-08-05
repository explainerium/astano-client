"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { HERO_IMAGES } from "@/lib/wpMedia"
import { cn } from "@/lib/utils"

const SLIDE_MS = 7000

/**
 * The three-slide hero from the live site.
 *
 * Autoplay pauses on hover and stops for good once someone uses an arrow —
 * a carousel that keeps moving under the reader is the reason most people
 * never finish the first slide.
 */
export const Hero = () => {
	const t = useTranslations("home.hero")
	const slides = t.raw("slides") as { title: string; body: string }[]

	const [index, setIndex] = useState(0)
	const [paused, setPaused] = useState(false)
	const [manual, setManual] = useState(false)

	const go = useCallback(
		(next: number) => setIndex((next + slides.length) % slides.length),
		[slides.length]
	)

	useEffect(() => {
		if (paused || manual) return
		const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS)
		return () => clearInterval(id)
	}, [paused, manual, slides.length])

	const step = (by: number) => {
		setManual(true)
		go(index + by)
	}

	return (
		<section
			className="group relative isolate overflow-hidden bg-neutral-900"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			aria-roledescription="carousel"
		>
			{slides.map((slide, i) => (
				<div
					key={i}
					aria-hidden={i !== index}
					className={cn(
						"transition-opacity duration-700",
						i === index ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
					)}
				>
					{/* Plain img: these are WordPress uploads on another origin, and
					    next/image would need that host allow-listed for no gain here. */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={HERO_IMAGES[i]}
						alt=""
						className="absolute inset-0 size-full object-cover"
						loading={i === 0 ? "eager" : "lazy"}
					/>
					{/* The live slide sits on a dark photograph; this keeps the copy
					    legible whatever the image behind it does. */}
					<div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />

					<div className="relative mx-auto flex w-full max-w-[1400px] flex-col justify-center px-6 py-24 md:py-32 lg:min-h-[560px]">
						<h1 className="font-heading max-w-3xl text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl lg:text-[44px] lg:leading-[1.1]">
							{slide.title}
						</h1>
						<p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
							{slide.body}
						</p>
						<Link
							href="/products"
							className="bg-primary text-primary-foreground mt-8 inline-flex w-fit items-center px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
						>
							{t("cta")}
						</Link>
					</div>
				</div>
			))}

			<button
				type="button"
				aria-label="Previous slide"
				onClick={() => step(-1)}
				className="absolute top-1/2 left-0 hidden -translate-y-1/2 bg-white/85 p-3 text-neutral-900 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white md:block"
			>
				<ChevronLeft className="size-5" />
			</button>
			<button
				type="button"
				aria-label="Next slide"
				onClick={() => step(1)}
				className="absolute top-1/2 right-0 hidden -translate-y-1/2 bg-white/85 p-3 text-neutral-900 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white md:block"
			>
				<ChevronRight className="size-5" />
			</button>

			<div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
				{slides.map((_, i) => (
					<button
						key={i}
						type="button"
						aria-label={`Go to slide ${i + 1}`}
						aria-current={i === index}
						onClick={() => {
							setManual(true)
							go(i)
						}}
						className={cn(
							"h-1.5 w-8 transition-colors",
							i === index ? "bg-primary" : "bg-white/50 hover:bg-white/80"
						)}
					/>
				))}
			</div>
		</section>
	)
}

export default Hero
