import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hub } from 'aws-amplify';
import { toast } from 'sonner';

import * as authUtil from '../../utils/authUtil';

import {
	Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelixSpinner } from '@/components/system/brand';
import {
	Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';

const schema = z.object({
	username: z.string().min(1, 'Enter your username.'),
	password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type SignInValues = z.infer<typeof schema>;

type SignInModalProps = {
	show: boolean;
	onHide: () => void;
	callback: () => void;
	mustVerifyEmailCallback: (username: string) => void;
	username?: string;
	password?: string;
};

function SignInModal({ show, onHide, callback, mustVerifyEmailCallback, username, password }: SignInModalProps) {
	const [isThinking, setIsThinking] = React.useState(false);

	const form = useForm<SignInValues>({
		resolver: zodResolver(schema),
		defaultValues: { username: username || '', password: password || '' },
	});

	React.useEffect(() => {
		const authListener = (data: any) => {
			if (data.payload.event === 'signIn_failure') {
				if (data.payload.data.code === 'UserNotConfirmedException') {
					onHide();
					mustVerifyEmailCallback(form.getValues('username'));
				} else if (data.payload.data.code === 'UserNotFoundException') {
					form.setError('username', { message: 'User not found.' });
				}
				setIsThinking(false);
			}
		};
		Hub.listen('auth', authListener);
		return () => Hub.remove('auth', authListener);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const closeModal = () => {
		setIsThinking(false);
		form.reset();
		onHide();
	};

	const onSubmit = (values: SignInValues) => {
		setIsThinking(true);
		authUtil
			.signIn(values.username, values.password)
			.then(() => {
				setIsThinking(false);
				callback();
				closeModal();
			})
			.catch((e: any) => {
				// UserNotConfirmedException / UserNotFoundException are handled by
				// the 'auth' Hub listener above; surface everything else here.
				if (e && e.code !== 'UserNotConfirmedException' && e.code !== 'UserNotFoundException') {
					toast.error(e.message || 'Sign in failed.');
				}
				setIsThinking(false);
			});
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && closeModal()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Sign in</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form id="signInForm" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input autoFocus placeholder="Username" {...field} />
									</FormControl>
									<FormMessage className="text-small text-plague-outline-ink" />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<Input type="password" placeholder="Password" {...field} />
									</FormControl>
									<FormMessage className="text-small text-plague-outline-ink" />
								</FormItem>
							)}
						/>
					</form>
				</Form>
				<DialogFooter>
					<Button variant="secondary" onClick={closeModal}>Cancel</Button>
					<Button type="submit" form="signInForm" disabled={isThinking}>
						{isThinking ? <HelixSpinner size="sm" /> : 'Sign in'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SignInModal;
