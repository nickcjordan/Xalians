import * as React from 'react';
import { toast } from 'sonner';

import * as dbApi from '../utils/dbApi';

import {
	AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
	AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

type Xalian = { xalianId: string; species: { name: string } };

type VerifyRemoveXalianModalProps = {
	show: boolean;
	onHide: () => void;
	onXalianDelete: () => void;
	xalian: Xalian;
	username: string;
};

function VerifyRemoveXalianModal({ show, onHide, onXalianDelete, xalian, username }: VerifyRemoveXalianModalProps) {
	const [isThinking, setIsThinking] = React.useState(false);

	const deleteXalian = () => {
		setIsThinking(true);
		dbApi
			.callUpdateUserRemoveXalian(username, xalian.xalianId)
			.then(() => {
				setIsThinking(false);
				toast.success('Xalian released.');
				onXalianDelete();
			})
			.catch((error: any) => {
				console.log(JSON.stringify(error, null, 2));
				toast.error('Could not release this Xalian. Please try again.');
				setIsThinking(false);
			});
	};

	return (
		<AlertDialog open={show} onOpenChange={(open) => !open && onHide()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Release {xalian.species.name}?</AlertDialogTitle>
					<AlertDialogDescription>
						You will no longer own this Xalian. This cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onHide}>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" disabled={isThinking} onClick={deleteXalian}>
						Release
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default VerifyRemoveXalianModal;
