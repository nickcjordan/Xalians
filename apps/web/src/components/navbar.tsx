// Tier: chrome. The navbar is on every page, including unmigrated v3 ones,
// so it keeps its own data-tier="chrome" and uses only v4 primitives.
import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Hub, Auth } from 'aws-amplify';
import { Menu } from 'lucide-react';

import AuthButtonGroup from './auth/authButtonGroup';
import FadeAlert from './fadeAlert';
import * as authUtil from '../utils/authUtil';

import { cn } from '@/lib/utils';
import { Shell } from '@/components/system/masthead';
import { BrandLockup } from '@/components/system/brand';
import { Button } from '@/components/ui/button';
import {
	Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet';

const NAV_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/encyclopedia', label: 'Encyclopedia' },
	{ href: '/generator', label: 'Generator' },
	{ href: '/duel', label: 'Duel' },
	{ href: '/reclamation', label: 'Reclamation' },
	{ href: '/long-return', label: 'Expedition' },
	{ href: '/train', label: 'Training' },
];

// The section links wear the tab underline mark without the tab "box":
// no border/bg at rest, the viable underline only when aria-current="page".
const navLinkClass =
	'inline-flex items-center gap-1.5 border-0 border-b-2 border-b-transparent bg-transparent px-0 py-2 font-legend text-[13px] font-medium uppercase tracking-legend whitespace-nowrap text-ink-2 transition-colors duration-1 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:border-b-viable aria-[current=page]:text-ink';

function isActiveRoute(pathname: string, href: string) {
	if (href === '/') {
		return pathname === '/';
	}
	return pathname === href || pathname.startsWith(href + '/');
}

type AuthState = { username: string; hasVerifiedEmail: boolean } | null;

type XalianNavbarProps = {
	authAlertCallback?: (user: AuthState) => void;
};

function XalianNavbar({ authAlertCallback }: XalianNavbarProps) {
	const location = useLocation();
	const [hidden, setHidden] = React.useState(false);
	const [menuOpen, setMenuOpen] = React.useState(false);

	const handleUserAuthAction = React.useCallback(
		(user: AuthState) => {
			if (authAlertCallback) {
				authAlertCallback(user);
			}
		},
		[authAlertCallback]
	);

	React.useEffect(() => {
		const hubListener = (data: any) => {
			if (data.payload.event === 'show-navbar') {
				setHidden(false);
			} else if (data.payload.event === 'hide-navbar') {
				setHidden(true);
			}
		};
		Hub.listen('navbar-channel', hubListener);

		let lastScrollTop = window.scrollY;
		const mountedAt = Date.now();
		const scrollListener = () => {
			const scrollTop = window.scrollY;
			// Some pages animate their own scroll position on mount (the
			// encyclopedia's hash-anchored sections do this with a smooth
			// scrollIntoView, several small events over ~1s). That is not the
			// user scrolling, so hide-on-scroll is suppressed for a moment
			// after mount rather than reading the page's own jump as one.
			const settling = Date.now() - mountedAt < 1500;
			if (scrollTop > 30 && !settling) {
				setHidden(scrollTop >= lastScrollTop);
			} else {
				setHidden(false);
			}
			lastScrollTop = scrollTop;
		};
		window.addEventListener('scroll', scrollListener);

		Auth.currentUserInfo().then((data: any) => {
			if (data && data.attributes) {
				handleUserAuthAction(authUtil.buildAuthState(data));
			}
		});

		return () => {
			Hub.remove('navbar-channel', hubListener);
			window.removeEventListener('scroll', scrollListener);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<React.Fragment>
			<header
				id="navvy"
				data-tier="chrome"
				className={cn(
					'sticky top-0 z-40 border-b border-edge bg-s0 transition-transform duration-2 ease-out',
					hidden && '-translate-y-full'
				)}
			>
				<Shell className="flex min-h-14 items-center gap-6">
					<BrandLockup />

					<nav className="ml-2 hidden flex-1 items-center gap-5 md:flex" aria-label="Primary">
						{NAV_LINKS.map((link) => (
							<NavLink
								key={link.href}
								to={link.href}
								exact={link.href === '/'}
								activeClassName=""
								className={navLinkClass}
								aria-current={isActiveRoute(location.pathname, link.href) ? 'page' : undefined}
							>
								{link.label}
							</NavLink>
						))}
					</nav>

					<div className="ml-auto hidden items-center gap-2 md:flex">
						<AuthButtonGroup size="sm" authAlertCallback={handleUserAuthAction} />
					</div>

					<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Open menu"
							className="ml-auto md:hidden"
							onClick={() => setMenuOpen(true)}
						>
							<Menu />
						</Button>
						<SheetContent side="right" className="flex flex-col gap-0 p-0">
							<SheetHeader className="border-b border-edge">
								<SheetTitle asChild>
									<BrandLockup />
								</SheetTitle>
							</SheetHeader>
							<nav className="flex flex-col gap-1 p-4" aria-label="Primary">
								{NAV_LINKS.map((link) => (
									<SheetClose asChild key={link.href}>
										<NavLink
											to={link.href}
											exact={link.href === '/'}
											activeClassName=""
											className="border-0 border-b border-edge bg-transparent px-1 py-3 font-legend text-[13px] font-medium uppercase tracking-legend text-ink-2 aria-[current=page]:text-viable-hi"
											aria-current={isActiveRoute(location.pathname, link.href) ? 'page' : undefined}
										>
											{link.label}
										</NavLink>
									</SheetClose>
								))}
							</nav>
							<div className="mt-auto flex flex-col items-start gap-2 border-t border-edge p-4">
								<AuthButtonGroup authAlertCallback={handleUserAuthAction} />
							</div>
						</SheetContent>
					</Sheet>
				</Shell>
			</header>
			<FadeAlert />
		</React.Fragment>
	);
}

export default XalianNavbar;
