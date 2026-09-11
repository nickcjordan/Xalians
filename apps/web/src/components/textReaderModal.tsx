import * as React from 'react';

import {
	Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type TextReaderModalProps = {
	show: boolean;
	onHide: () => void;
	title?: React.ReactNode;
	body?: React.ReactNode;
	footer?: React.ReactNode;
};

function TextReaderModal({ show, onHide, title, body, footer }: TextReaderModalProps) {
	return (
		<Dialog open={show} onOpenChange={(open: boolean) => !open && onHide()}>
			<DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
				{title && (
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
				)}
				{body && (
					<ScrollArea className="min-h-0 flex-1">
						<div className="font-body text-body text-ink-2">{body}</div>
					</ScrollArea>
				)}
				{footer && <DialogFooter>{footer}</DialogFooter>}
			</DialogContent>
		</Dialog>
	);
}

export default TextReaderModal;
