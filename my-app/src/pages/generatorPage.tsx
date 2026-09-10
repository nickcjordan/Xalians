import * as React from 'react';
import XalianRecord from '../components/xalianRecord';
import { MoveSet, Meter } from '@/components/system/record';
import { Shell, Masthead } from '@/components/system/masthead';
import { HelixSpinner, HelixMark } from '@/components/system/brand';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import XalianNavbar from '../components/navbar';
import * as xalianApi from '../utils/xalianApi';
import * as dbApi from '../utils/dbApi';
import { stat as statColors } from '../constants/designTokens';
import * as constants from '../constants/constants';

// Tier: chrome. Generation, review and keeping a Xalian is a configure/manage
// screen (docs/DESIGN_SYSTEM.md section 1); the record itself is a featured
// use of glass, not a game in progress.

const STAT_ROWS: [string, string, string][] = [
	['standardAttackPoints', 'Std attack', statColors.standardAttack],
	['specialAttackPoints', 'Spc attack', statColors.specialAttack],
	['standardDefensePoints', 'Std defense', statColors.standardDefense],
	['specialDefensePoints', 'Spc defense', statColors.specialDefense],
	['speedPoints', 'Speed', statColors.speed],
	['evasionPoints', 'Evasion', statColors.evasion],
	['staminaPoints', 'Stamina', statColors.stamina],
	['recoveryPoints', 'Recovery', statColors.recovery],
];

function GeneratorPage() {
	// Holds the whole { xalian, signature } envelope generateXalian returns. `xalian` is
	// the legacy shape every render below already expects; `signature` only matters to
	// saveXalian, which sends the envelope back unchanged so the server can verify the
	// stats were never edited client-side.
	const [envelope, setEnvelope] = React.useState<any>(null);
	const [isLoading, setIsLoading] = React.useState(true);
	const [isGenerating, setIsGenerating] = React.useState(false);
	const [loggedInUser, setLoggedInUser] = React.useState<any>(null);
	const [jsonOpen, setJsonOpen] = React.useState(false);

	const xalian = envelope ? envelope.xalian : null;

	const getXalian = React.useCallback(() => {
		setIsGenerating(true);
		xalianApi
			.callGenerateXalian()
			.then((e: any) => {
				setEnvelope(e);
				setIsLoading(false);
				setIsGenerating(false);
			})
			.catch(() => {
				setIsGenerating(false);
				toast.error('Could not generate a Xalian. Please try again.');
			});
	}, []);

	React.useEffect(() => {
		getXalian();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const saveXalian = () => {
		setIsLoading(true);
		// Keeping is one call: the server verifies the signature, persists, and appends
		// the id to the caller's user record itself.
		dbApi
			.callKeepXalian(envelope)
			.then(() => {
				setIsLoading(false);
				toast.success(`${xalian.species.name} kept.`);
			})
			.catch(() => {
				setIsLoading(false);
				toast.error('Could not keep your Xalian. Please try again.');
			});
	};

	const canKeep = !!loggedInUser;
	const printing = isGenerating;

	return (
		<React.Fragment>
			<XalianNavbar authAlertCallback={setLoggedInUser} />

			<main className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
				<Shell>
					<Masthead
						kicker="Generator"
						title={xalian ? xalian.species.name : 'Generator'}
						aside={
							<React.Fragment>
								<Button
									variant="secondary"
									disabled={!canKeep || !xalian || printing || isLoading}
									onClick={saveXalian}
								>
									{canKeep ? 'Keep' : 'Sign in to keep'}
								</Button>
								<Button disabled={printing} onClick={getXalian}>
									{xalian ? 'Generate another' : 'Generate a Xalian'}
								</Button>
							</React.Fragment>
						}
					/>

					{printing ? (
						<Card variant="glass" className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
							<HelixSpinner size="lg" />
							<span className="type-legend">Generating</span>
						</Card>
					) : xalian ? (
						<Card variant="glass">
							<XalianRecord xalian={xalian} />
						</Card>
					) : (
						<Card variant="glass" className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center">
							<div style={{ '--color-viable-hi': 'var(--color-ink-3)' } as React.CSSProperties}>
								<HelixMark className="h-24 w-auto" title="No Xalian" />
							</div>
							<span className="type-legend">No Xalian yet</span>
							<p className="m-0 font-body text-body text-ink-2">Generate one to see its record here.</p>
						</Card>
					)}

					{xalian && !printing && (
						<React.Fragment>
							<div className="mt-4 grid gap-4 lg:grid-cols-2">
								<Card variant="panel">
									<div className="flex items-baseline justify-between">
										<span className="type-legend">Stats</span>
										<span className="type-legend text-ink-3">Current / potential</span>
									</div>
									<div>
										{STAT_ROWS.map(([key, label, color]) => {
											const s = xalian.stats[key];
											return (
												<div key={key} style={{ '--el': color } as React.CSSProperties}>
													<Meter name={label} value={s.points} max={constants.STAT_POINT_MAX} potential={constants.STAT_POINT_MAX} />
												</div>
											);
										})}
									</div>
								</Card>

								<Card variant="panel">
									<span className="type-legend">Moves</span>
									<MoveSet moves={xalian.moves} className="lg:[&_p]:truncate" />
								</Card>
							</div>

							<Button variant="ghost" className="mt-4" onClick={() => setJsonOpen(true)}>
								Raw data
							</Button>
						</React.Fragment>
					)}
				</Shell>
			</main>

			{xalian && (
				<Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
					<DialogContent className="sm:max-w-2xl">
						<DialogHeader>
							<DialogTitle>{xalian.species.name} record data</DialogTitle>
						</DialogHeader>
						<ScrollArea className="max-h-[60vh]">
							<pre className="m-0 whitespace-pre-wrap break-words type-data text-small text-ink">{JSON.stringify(xalian, null, 2)}</pre>
						</ScrollArea>
					</DialogContent>
				</Dialog>
			)}
		</React.Fragment>
	);
}

export default GeneratorPage;
