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

const schema = z
	.object({
		username: z
			.string()
			.min(6, 'Must be at least 6 characters.')
			.max(30, 'Must be at most 30 characters.')
			.regex(/^[A-Za-z0-9\-_]+$/, "Letters, numbers, '-' and '_' only."),
		email: z.string().email('Enter a valid email address.'),
		password: z.string().min(8, 'Password must be at least 8 characters.'),
		confirmPassword: z.string().min(8, 'Password must be at least 8 characters.'),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match.',
		path: ['confirmPassword'],
	});

type SignUpValues = z.infer<typeof schema>;

type SignUpModalProps = {
	show: boolean;
	onHide: () => void;
	callback: (username: string, email: string, password: string) => void;
};

function SignUpModal({ show, onHide, callback }: SignUpModalProps) {
	const [isThinking, setIsThinking] = React.useState(false);

	const form = useForm<SignUpValues>({
		resolver: zodResolver(schema),
		defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
	});

	const closeModal = () => {
		setIsThinking(false);
		form.reset();
		onHide();
	};

	const onSubmit = (values: SignUpValues) => {
		setIsThinking(true);
		authUtil
			.signUp(values.email, values.username, values.password)
			.then(() => {
				setIsThinking(false);
				callback(values.username, values.email, values.password);
				onHide();
			})
			.catch((error: any) => {
				setIsThinking(false);
				const code = error && (error.name || error.code);
				if (code === 'UsernameExistsException') {
					form.setError('username', { message: 'Username already exists.' });
				} else if (code === 'InvalidPasswordException') {
					form.setError('password', { message: error.message || 'Password does not meet requirements.' });
				} else {
					toast.error((error && error.message) || 'Sign up failed. Please try again.');
				}
			});
	};

	return (
		<Dialog open={show} onOpenChange={(open) => !open && closeModal()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create a Xalians account</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form id="signupForm" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input autoFocus placeholder="Username" {...field} />
									</FormControl>
									<FormDescription className="text-small text-ink-2">
										Must be unique — can contain letters, numbers, &apos;-&apos;, or &apos;_&apos;.
									</FormDescription>
									<FormMessage className="text-small text-plague-outline-ink" />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email address</FormLabel>
									<FormControl>
										<Input type="email" placeholder="Email address" {...field} />
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
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm password</FormLabel>
									<FormControl>
										<Input type="password" placeholder="Confirm password" {...field} />
									</FormControl>
									<FormMessage className="text-small text-plague-outline-ink" />
								</FormItem>
							)}
						/>
					</form>
				</Form>
				<DialogFooter>
					<Button variant="secondary" onClick={closeModal}>Cancel</Button>
					<Button type="submit" form="signupForm" disabled={isThinking}>
						{isThinking ? <HelixSpinner size="sm" /> : 'Create account'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SignUpModal;
