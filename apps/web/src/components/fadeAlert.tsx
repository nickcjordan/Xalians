// Tier: chrome. Bridges the legacy `alertUtil.sendAlert` Hub channel (still
// used outside this brief by the generator page and the duel board) onto
// sonner toasts. Renders nothing itself — the toast is drawn by <Toaster />
// in App.js. Mounted once, from the navbar, so it exists on every page.
import * as React from 'react';
import { Hub } from '@aws-amplify/core';
import { toast } from 'sonner';

const VARIANT_TO_TOAST: Record<string, (message: string) => void> = {
	success: (m) => toast.success(m),
	danger: (m) => toast.error(m),
	warning: (m) => toast.warning(m),
	info: (m) => toast.info(m),
};

function FadeAlert() {
	React.useEffect(() => {
		const alertListener = (data: any) => {
			if (data.payload.event !== 'new-alert') {
				return;
			}
			const req = data.payload.data || {};
			const message = [req.title, req.text].filter(Boolean).join(' — ');
			const emit = VARIANT_TO_TOAST[req.variant] || ((m: string) => toast(m));
			emit(message || 'Notice');
		};
		Hub.listen('alert', alertListener);
		return () => Hub.remove('alert', alertListener);
	}, []);

	return null;
}

export default FadeAlert;
