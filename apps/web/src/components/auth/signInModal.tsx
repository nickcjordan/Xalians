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
	Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage,
} from '@/components/ui/form';

const signInSchema = z.object({
	username: z.string().min(1, 'Enter your username.'),
	password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const requestResetSchema = z.object({
	username: z.string().min(1, 'Enter your username.'),
});

const confirmResetSchema = z.object({
	code: z.string().min(1, 'Enter the code from your email.'),
	newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
});

type SignInValues = z.infer<typeof signInSchema>;
type RequestResetValues = z.infer<typeof requestResetSchema>;
type ConfirmResetValues = z.infer<typeof confirmResetSchema>;

type Step = 'signIn' | 'requestReset' | 'confirmReset';

type SignInModalProps = {
	show: boolean;
	onHide: () => void;
	callback: () => void;
	mustVerifyEmailCallback: (username: string) => void;
	switchToSignUp?: () => void;
	username?: string;
	password?: string;
};

function SignInModal({
	show, onHide, callback, mustVerifyEmailCallback, switchToSignUp, username, password,
}: SignInModalProps) {
	const [isThinking, setIsThinking] = React.useState(false);
	const [step, setStep] = React.useState<Step>('signIn');

	const signInForm = useForm<SignInValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { username: username || '', password: password || '' },
	});

	const requestResetForm = useForm<RequestResetValues>({
		resolver: zodResolver(requestResetSchema),
		defaultValues: { username: '' },
	});

	const confirmResetForm = useForm<ConfirmResetValues>({
		resolver: zodResolver(confirmResetSchema),
		defaultValues: { code: '', newPassword: '' },
	});

	const resetToSignIn = (prefillUsername?: string) => {
		setStep('signIn');
		requestResetForm.reset();
		confirmResetForm.reset();
		if (prefillUsername) {
			signInForm.setValue('username', prefillUsername);
		}
	};

	const closeModal = () => {
		setIsThinking(false);
		signInForm.reset();
		requestResetForm.reset();
		confirmResetForm.reset();
		setStep('signIn');
		onHide();
	};

	const onSignIn = (values: SignInValues) => {
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
					signInForm.setError('password', { message: 'Username or password is incorrect.' });
				} else {
					toast.error(e.message || 'Sign in failed.');
				}
				setIsThinking(false);
			});
	};

	const onRequestReset = (values: RequestResetValues) => {
		setIsThinking(true);
		authUtil
			.resetPassword(values.username)
			.then(() => {
				setIsThinking(false);
				setStep('confirmReset');
			})
			.catch((e: any) => {
				setIsThinking(false);
				requestResetForm.setError('username', { message: (e && e.message) || 'Could not send a reset code. Please try again.' });
			});
	};

	const onConfirmReset = (values: ConfirmResetValues) => {
		setIsThinking(true);
		const resetUsername = requestResetForm.getValues('username');
		authUtil
			.confirmResetPassword(resetUsername, values.code, values.newPassword)
			.then(() => {
				setIsThinking(false);
				toast.success('Password updated. Sign in with the new one.');
				resetToSignIn(resetUsername);
			})
			.catch((e: any) => {
				setIsThinking(false);
				confirmResetForm.setError('code', { message: (e && e.message) || 'Could not reset your password. Please try again.' });
			});
	};

	const title = step === 'signIn' ? 'Sign in' : 'Reset password';

	return (
		<Dialog open={show} onOpenChange={(open: boolean) => !open && closeModal()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>

				{step === 'signIn' && (
					<React.Fragment>
						<Form {...signInForm}>
							<form id="signInForm" onSubmit={signInForm.handleSubmit(onSignIn)} className="flex flex-col gap-4">
								<FormField
									control={signInForm.control}
									name="username"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input autoFocus autoComplete="username" placeholder="Username" {...field} />
											</FormControl>
											<FormMessage className="text-small text-plague-outline-ink" />
										</FormItem>
									)}
								/>
								<FormField
									control={signInForm.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input type="password" autoComplete="current-password" placeholder="Password" {...field} />
											</FormControl>
											<FormDescription className="text-small text-ink-2">At least 8 characters.</FormDescription>
											<FormMessage className="text-small text-plague-outline-ink" />
											<Button
												type="button"
												variant="link"
												className="h-auto self-start p-0"
												onClick={() => setStep('requestReset')}
											>
												Forgot password?
											</Button>
										</FormItem>
									)}
								/>
							</form>
						</Form>
						<DialogFooter className="sm:justify-between">
							<p className="text-small text-ink-2">
								New here?{' '}
								<Button
									type="button"
									variant="link"
									className="h-auto p-0 text-small"
									onClick={() => {
										closeModal();
										switchToSignUp?.();
									}}
								>
									Create an account.
								</Button>
							</p>
							<div className="flex gap-2">
								<Button variant="secondary" onClick={closeModal}>Cancel</Button>
								<Button type="submit" form="signInForm" disabled={isThinking}>
									{isThinking ? <HelixSpinner size="sm" /> : 'Sign in'}
								</Button>
							</div>
						</DialogFooter>
					</React.Fragment>
				)}

				{step === 'requestReset' && (
					<React.Fragment>
						<Form {...requestResetForm}>
							<form id="requestResetForm" onSubmit={requestResetForm.handleSubmit(onRequestReset)} className="flex flex-col gap-4">
								<FormField
									control={requestResetForm.control}
									name="username"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input autoFocus autoComplete="username" placeholder="Username" {...field} />
											</FormControl>
											<FormMessage className="text-small text-plague-outline-ink" />
										</FormItem>
									)}
								/>
							</form>
						</Form>
						<DialogFooter>
							<Button variant="secondary" onClick={() => resetToSignIn()}>Back to sign in</Button>
							<Button type="submit" form="requestResetForm" disabled={isThinking}>
								{isThinking ? <HelixSpinner size="sm" /> : 'Send reset code'}
							</Button>
						</DialogFooter>
					</React.Fragment>
				)}

				{step === 'confirmReset' && (
					<React.Fragment>
						<Form {...confirmResetForm}>
							<form id="confirmResetForm" onSubmit={confirmResetForm.handleSubmit(onConfirmReset)} className="flex flex-col gap-4">
								<FormField
									control={confirmResetForm.control}
									name="code"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Verification code</FormLabel>
											<FormControl>
												<Input autoFocus autoComplete="one-time-code" placeholder="Verification code" {...field} />
											</FormControl>
											<FormDescription className="text-small text-ink-2">
												You should have received an email with a code.
											</FormDescription>
											<FormMessage className="text-small text-plague-outline-ink" />
										</FormItem>
									)}
								/>
								<FormField
									control={confirmResetForm.control}
									name="newPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>New password</FormLabel>
											<FormControl>
												<Input type="password" autoComplete="new-password" placeholder="New password" {...field} />
											</FormControl>
											<FormDescription className="text-small text-ink-2">At least 8 characters.</FormDescription>
											<FormMessage className="text-small text-plague-outline-ink" />
										</FormItem>
									)}
								/>
							</form>
						</Form>
						<DialogFooter>
							<Button variant="secondary" onClick={() => resetToSignIn()}>Back to sign in</Button>
							<Button type="submit" form="confirmResetForm" disabled={isThinking}>
								{isThinking ? <HelixSpinner size="sm" /> : 'Reset password'}
							</Button>
						</DialogFooter>
					</React.Fragment>
				)}
			</DialogContent>
		</Dialog>
	);
}

export default SignInModal;
