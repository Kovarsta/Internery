import { describe, expect, it, vi } from 'vitest';
import { createDeepSeekProvider } from './deepseek.ts';
import { AiProviderError, type AiFitRequest, type AiSuggestionRequest } from './provider.ts';

const job = {
	id: '00000000-0000-4000-8000-000000000001',
	title: 'Part-time barista',
	description: 'Serve customers and keep the counter clean.',
	categoryName: 'Food and beverage',
	location: 'District 1, Ho Chi Minh City',
	daysOfWeek: ['SATURDAY'],
	startTime: '08:00',
	endTime: '12:00',
	salaryAmount: 60_000,
	salaryType: 'HOURLY'
};

const fitRequest: AiFitRequest = {
	cvText: 'Customer service at a coffee shop.',
	job
};

const suggestionRequest: AiSuggestionRequest = {
	student: { major: 'Business Administration', skills: ['Customer service'], availability: null },
	jobs: [job]
};

/** Builds a chat completion response with a JSON string as the content. */
function completion(content: string, status = 200): Response {
	return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('createDeepSeekProvider', () => {
	it('parses a fit answer and sends the JSON-mode request', async () => {
		const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
			completion(
				JSON.stringify({
					verdict: 'FIT',
					reasons: [{ text: 'The job needs customer service.', cvQuote: 'Customer service' }],
					gaps: []
				})
			)
		);

		const provider = createDeepSeekProvider({
			apiKey: 'test-key',
			model: 'deepseek-flash',
			fetchImplementation
		});

		const answer = await provider.explainFit(fitRequest, AbortSignal.timeout(1_000));

		expect(answer).toEqual({
			verdict: 'FIT',
			reasons: [{ text: 'The job needs customer service.', cvQuote: 'Customer service' }],
			gaps: [],
			model: 'deepseek-flash'
		});

		const [url, init] = fetchImplementation.mock.calls[0];
		const body = JSON.parse(String(init?.body));

		expect(url).toBe('https://api.deepseek.com/chat/completions');
		expect(body.response_format).toEqual({ type: 'json_object' });
		expect(body.thinking).toEqual({ type: 'disabled' });
		expect(body.model).toBe('deepseek-flash');
		expect(body.messages[1].content).toContain('Customer service at a coffee shop.');
	});

	it('parses a suggestion answer', async () => {
		const fetchImplementation = vi
			.fn<typeof fetch>()
			.mockResolvedValue(completion(JSON.stringify({ rankedJobIds: [job.id] })));

		const provider = createDeepSeekProvider({
			apiKey: 'test-key',
			model: 'deepseek-flash',
			fetchImplementation
		});

		await expect(provider.rankJobs(suggestionRequest, AbortSignal.timeout(1_000))).resolves.toEqual(
			{ rankedJobIds: [job.id], model: 'deepseek-flash' }
		);
	});

	it('rejects content that is not JSON', async () => {
		const fetchImplementation = vi
			.fn<typeof fetch>()
			.mockResolvedValue(completion('Sure! Here is the answer.'));

		const provider = createDeepSeekProvider({
			apiKey: 'test-key',
			model: 'deepseek-flash',
			fetchImplementation
		});

		await expect(provider.explainFit(fitRequest, AbortSignal.timeout(1_000))).rejects.toMatchObject(
			{ failure: 'invalid-response' }
		);
	});

	it('rejects a JSON answer with the wrong shape', async () => {
		const fetchImplementation = vi
			.fn<typeof fetch>()
			.mockResolvedValue(completion(JSON.stringify({ verdict: 'PERFECT' })));

		const provider = createDeepSeekProvider({
			apiKey: 'test-key',
			model: 'deepseek-flash',
			fetchImplementation
		});

		await expect(provider.explainFit(fitRequest, AbortSignal.timeout(1_000))).rejects.toMatchObject(
			{ failure: 'invalid-response' }
		);
	});

	it('reports an HTTP failure', async () => {
		const fetchImplementation = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response('upstream down', { status: 503 }));

		const provider = createDeepSeekProvider({
			apiKey: 'test-key',
			model: 'deepseek-flash',
			fetchImplementation
		});

		await expect(provider.explainFit(fitRequest, AbortSignal.timeout(1_000))).rejects.toMatchObject(
			{ failure: 'http' }
		);
	});

	it('refuses to call without an API key', async () => {
		const fetchImplementation = vi.fn<typeof fetch>();

		const provider = createDeepSeekProvider({
			apiKey: '',
			model: 'deepseek-flash',
			fetchImplementation
		});

		await expect(provider.explainFit(fitRequest, AbortSignal.timeout(1_000))).rejects.toMatchObject(
			{ failure: 'not-configured' }
		);
		expect(fetchImplementation).not.toHaveBeenCalled();
	});

	it('classifies an aborted request as a timeout', async () => {
		const controller = new AbortController();
		controller.abort();

		const fetchImplementation = vi
			.fn<typeof fetch>()
			.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));

		const provider = createDeepSeekProvider({
			apiKey: 'test-key',
			model: 'deepseek-flash',
			fetchImplementation
		});

		await expect(provider.explainFit(fitRequest, controller.signal)).rejects.toBeInstanceOf(
			AiProviderError
		);
		await expect(provider.explainFit(fitRequest, controller.signal)).rejects.toMatchObject({
			failure: 'timeout'
		});
	});
});
