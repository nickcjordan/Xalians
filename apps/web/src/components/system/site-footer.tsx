import * as React from "react"
import { Link } from "react-router"

import { cn } from "@/lib/utils"
import { Shell } from "@/components/system/masthead"
import { BrandLockup } from "@/components/system/brand"
import { Separator } from "@/components/ui/separator"

/**
 * Tier: chrome (docs/DESIGN_SYSTEM.md section 1). The site footer: rendered
 * once from App.js below the routes, hidden on the immersive game routes
 * (issue #433). Surface s0, top border edge, matching the navbar's level.
 */

const EXPLORE_LINKS = [
	{ href: "/encyclopedia", label: "Reading Room" },
	{ href: "/encyclopedia/story", label: "The Story" },
	{ href: "/encyclopedia/worlds", label: "Worlds" },
	{ href: "/encyclopedia/species", label: "Bestiary" },
	{ href: "/encyclopedia/powers", label: "Powers" },
	{ href: "/encyclopedia/index", label: "Index" },
]

const MAKE_LINKS = [
	{ href: "/generator", label: "Generator" },
	{ href: "/account", label: "Your account" },
	{ href: "/trade/new", label: "Propose a trade" },
]

const PLAY_LINKS = [
	{ href: "/duel", label: "Duel" },
	{ href: "/reclamation", label: "Reclamation" },
	{ href: "/long-return", label: "Expedition" },
	{ href: "/powerworks", label: "Powerworks" },
	{ href: "/arcade", label: "Arcade" },
]

const footerLinkClass =
	"flex min-h-11 items-center font-body text-small text-ink-2 transition-colors duration-1 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-0"

function FooterColumn({ label, links }: { label: string; links: { href: string; label: string }[] }) {
	return (
		<div>
			<p className="type-legend mb-3">{label}</p>
			<ul className="flex flex-col gap-1">
				{links.map((link) => (
					<li key={link.href}>
						<Link to={link.href} className={footerLinkClass}>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}

function SiteFooter({ className, ...props }: React.ComponentProps<"footer">) {
	const buildSha = (import.meta.env.VITE_BUILD_SHA as string | undefined) || "dev"
	const shortSha = buildSha.slice(0, 7)

	return (
		<footer
			data-slot="site-footer"
			data-tier="chrome"
			className={cn("border-t border-edge bg-s0", className)}
			{...props}
		>
			<Shell className="py-10">
				<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,auto))]">
					<div className="max-w-sm">
						<BrandLockup />
						<p className="mt-3 font-body text-small text-ink-2">
							Xalians is a world of generated creatures, the archive of the worlds they come from, and
							the games that use them.
						</p>
					</div>
					<FooterColumn label="Explore" links={EXPLORE_LINKS} />
					<FooterColumn label="Make" links={MAKE_LINKS} />
					<FooterColumn label="Play" links={PLAY_LINKS} />
				</div>

				<Separator className="my-8" />

				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="type-data m-0 text-small text-ink-3">Build {shortSha}</p>
					<p className="m-0 font-body text-small text-ink-3">© 2026 Xalians</p>
				</div>
			</Shell>
		</footer>
	)
}

export { SiteFooter }
