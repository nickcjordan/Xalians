import * as React from 'react';
import { toast } from 'sonner';
import type { XalianRecord } from '@xalians/content/schema';
import { speciesDisplayName } from '@xalians/rules/generator';

import * as dbApi from '../utils/dbApi';

import {
	AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
	AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

/**
 * Confirms releasing one of the caller's own Xalians. Release is
 * DELETE /xalians/{xalianId}; the server is what enforces ownership, so the
 * caller's id is not sent and cannot be spoofed here.
 */

type VerifyRemoveXalianModalProps = {
	show: boolean;
	onHide: () => void;
	onXalianDelete: () => void;
	record: XalianRecord;
};

function VerifyRemoveXalianModal({ show, onHide, onXalianDelete, record }: VerifyRemoveXalianModalProps) {
	const [isThinking, setIsThinking] = React.useState(false);
	const name = speciesDisplayName(record.species);

	const release = () => {
		setIsThinking(true);
		dbApi
			.callReleaseXalian(record.id)
			.then(() => {
				setIsThinking(false);
				toast.success(`${name} released.`);
				onXalianDelete();
			})
			.catch(() => {
				toast.error('Could not release this Xalian. Please try again.');
				setIsThinking(false);
			});
	};

	return (
		<AlertDialog open={show} onOpenChange={(open) => !open && onHide()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Release {name}?</AlertDialogTitle>
					<AlertDialogDescription>
						This creature leaves the registry and no one owns it. It cannot be undone, and the same seed will not be
						drawn again.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onHide}>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" disabled={isThinking} onClick={release}>
						Release
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default VerifyRemoveXalianModal;
