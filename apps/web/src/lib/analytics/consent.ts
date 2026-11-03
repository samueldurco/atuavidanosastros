export function changeAnalyticsConsent(value: 'granted' | 'denied') {
	localStorage.setItem('atv-analytics-consent', value);
	window.dispatchEvent(new Event('atv-analytics-consent-change'));
}
