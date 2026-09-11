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

const schema = z.object({
	username: z.string().min(1, 'Enter your username.'),
	code: z.string().min(1, 'Enter the verification code.'),
});

type VerifyValues = z.infer<typeof schema>;

type VerifyEmailModalProps = {
	show: boolean;
	onHide: () => void;
	callback: () => void;
	username?: string;
	email?: string;
};

function VerifyEmailModal({ show, onHide, callback, username, email }: VerifyEmailModalProps) {
	const [isThinking, setIsThinking] = React.useState(false);
	const prefilled = Boolean(username && email);

	const form = useForm<VerifyValues>({
		resolver: zodResolver(schema),
		defaultValues: { username: username || '', code: '' },
	});

	React.useEffect(() => {
		form.setValue('username', username || '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [username]);

	const onSubmit = (values: VerifyValues) => {
		setIsThinking(true);
		authUtil
			.confirmSignUp(values.username, values.code)
			.then(() => {
				setIsThinking(false);
				callback();
			})
			.catch((e: any) => {
				setIsThinking(false);
				toast.error((e && e.message) || 'Verification failed. Please check the code and try again.');
			});
	};

	const sendVerificationCode = () => {
		const user = form.getValues('username');
		if (!user) {
			form.setError('username', { message: 'Enter your username.' });
			return;
		}
		authUtil
			.resendConfirmationCode(user)
			.then(() => {
				toast.success('A new verification email is on its way.');
			})
			.catch((e: any) => {
				toast.error((e && e.message) || 'Could not send a new code. Please try again.');
			});
	};

	return (
		<Dialog open={show} onOpenChange={(open: boolean) => !open && onHide()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Verify email address</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form id="verifyEmailForm" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input placeholder="Username" disabled={prefilled} {...field} />
									</FormControl>
									<FormMessage className="text-small text-plague-outline-ink" />
								</FormItem>
							)}
						/>
						{prefilled && (
							<FormItem>
								<FormLabel>Email address</FormLabel>
								<FormControl>
									<Input type="email" value={email} disabled />
								</FormControl>
							</FormItem>
						)}
						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Verification code</FormLabel>
									<FormControl>
										<Input autoFocus placeholder="Verification code" {...field} />
									</FormControl>
									<FormDescription className="text-small text-ink-2">
										You should have received an email with a verification code.
									</FormDescription>
									<FormMessage className="text-small text-plague-outline-ink" />
								</FormItem>
							)}
						/>
						<Button type="button" variant="link" className="self-start" onClick={sendVerificationCode}>
							Send another verification code
						</Button>
					</form>
				</Form>
				<DialogFooter>
					<Button variant="secondary" onClick={onHide}>Cancel</Button>
					<Button type="submit" form="verifyEmailForm" disabled={isThinking}>
						{isThinking ? <HelixSpinner size="sm" /> : 'Verify email'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default VerifyEmailModal;
