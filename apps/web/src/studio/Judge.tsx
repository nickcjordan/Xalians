import * as React from 'react';

/** The first non-empty "what to judge" list of a presented set (X25): the first item that has one supplies it. */
export function firstJudge(items: { judge?: string[] }[]): string[] | undefined {
	return items.find((i) => i.judge && i.judge.length > 0)?.judge;
}

/** Numbered checks written by the orchestrator, shown above the images so no chat round trip is needed. */
export function JudgeList({ checks, className }: { checks: string[] | undefined; className?: string }) {
	if (!checks || checks.length === 0) return null;
	return (
		<section aria-label="What to judge" className={`border border-edge-strong border-l-4 border-l-ink bg-s1 p-3 ${className ?? ''}`}>
			<h3 className="type-legend m-0 mb-1 text-[10.5px] text-ink">What to judge</h3>
			<ol className="m-0 flex list-none flex-col gap-1 p-0 font-body text-small text-ink">
				{checks.map((c, i) => (
					<li key={i} className="flex gap-2">
						<span className="type-data w-5 shrink-0 text-right text-[12px] font-bold text-ink-2">{i + 1}.</span>
						<span className="min-w-0">{c}</span>
					</li>
				))}
			</ol>
		</section>
	);
}
