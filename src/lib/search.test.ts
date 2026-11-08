import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from './search.ts';

describe('normalizeSearchText', () => {
	it('strips Vietnamese diacritics', () => {
		expect(normalizeSearchText('Hồ Chí Minh')).toBe('ho chi minh');
		expect(normalizeSearchText('Đà Nẵng')).toBe('da nang');
	});

	it('turns punctuation into spaces and collapses whitespace', () => {
		expect(normalizeSearchText('  TP.HCM  ')).toBe('tp hcm');
		expect(normalizeSearchText('Hải Phòng / HP')).toBe('hai phong hp');
	});
});
