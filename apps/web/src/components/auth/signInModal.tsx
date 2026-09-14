import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
				const code = e && (e.name || e.code);
				if (code === 'UserNotConfirmedException') {
					onHide();
					mustVerifyEmailCallback(values.username);
				} else if (code === 'UserNotFoundException' || code === 'NotAuthorizedException') {
					// Do not disclose whether a username exists. Cognito uses both
					// exceptions for invalid credentials depending on pool settings.
					form.setError('password', { message: 'Username or password is incorrect.' });
				} else {
					toast.error(e.message || 'Sign in failed.');
				}
				setIsThinking(false);
			});
	};

	return (
		<Dialog open={show} onOpenChange={(open: boolean) => !open && closeModal()}>
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
