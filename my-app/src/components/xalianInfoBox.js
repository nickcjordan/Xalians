import React from 'react';
import XalianSpeciesBadge from './xalianSpeciesBadge';
import EncyclopediaLink from './encyclopediaLink';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileCode } from 'lucide-react';

/**
 * A specimen's name, id and type chips, with an optional raw-data dialog.
 *
 * Version 4 on the new stack: no react-bootstrap `Stack`/`Col`/`Modal`; the
 * raw-data trigger is a plain icon button opening a shadcn `Dialog`. Every
 * prop from the previous version is kept.
 */
class XalianInfoBox extends React.Component {
	state = { jsonOpen: false };

	render() {
		let name = this.props.xalian ? this.props.xalian.species.name : this.props.species ? this.props.species.name : null;
		let id = this.props.xalian ? this.props.xalian.speciesId : this.props.species ? this.props.species.id : null;

		return (
			<React.Fragment>
				{this.props.xalian && (
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="type-heading m-0"><EncyclopediaLink kind="species" name={name} variant="inline" /></h1>
						{!this.props.hideId &&
							<span className="type-data text-small text-ink-3">#{id}</span>
						}
						<div className="flex flex-wrap justify-center gap-2">
							<XalianSpeciesBadge type={this.props.xalian.elements.primaryType.toLowerCase()} />
							<XalianSpeciesBadge type={this.props.xalian.elements.secondaryType.toLowerCase()} />
						</div>
						{this.props.json && (
							<Button variant="ghost" size="icon-sm" aria-label="Raw data" onClick={() => this.setState({ jsonOpen: true })}>
								<FileCode />
							</Button>
						)}
					</div>
				)}
				{this.props.species && (
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="type-heading m-0"><EncyclopediaLink kind="species" name={name} variant="inline" /></h1>
						{!this.props.hideId &&
							<span className="type-data text-small text-ink-3">#{id}</span>
						}
						<div className="flex flex-wrap justify-center gap-2">
							{this.props.species.type && <XalianSpeciesBadge type={this.props.species.type.toLowerCase()} />}
							{this.props.type && <XalianSpeciesBadge type={this.props.type.toLowerCase()} />}
						</div>
						{this.props.json && (
							<Button variant="ghost" size="icon-sm" aria-label="Raw data" onClick={() => this.setState({ jsonOpen: true })}>
								<FileCode />
							</Button>
						)}
					</div>
				)}

				{this.props.json &&
					<Dialog open={this.state.jsonOpen} onOpenChange={(open) => this.setState({ jsonOpen: open })}>
						<DialogContent className="sm:max-w-2xl">
							<DialogHeader>
								<DialogTitle>{name || 'Xalian'} record data</DialogTitle>
							</DialogHeader>
							<ScrollArea className="max-h-[60vh]">
								<pre className="m-0 whitespace-pre-wrap break-words type-data text-small text-ink">{this.props.json}</pre>
							</ScrollArea>
						</DialogContent>
					</Dialog>
				}
			</React.Fragment>
		);
	}
}

export default XalianInfoBox;
