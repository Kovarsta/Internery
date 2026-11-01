import { describe, expect, it } from 'vitest';
import { findScamTerms } from './job-moderation.ts';
import { SCAM_TERMS } from './scam-terms.ts';

describe('SCAM_TERMS', () => {
	it('stores every term in lowercase and trimmed', () => {
		for (const term of SCAM_TERMS) {
			expect(term).toBe(term.toLowerCase().trim());
		}
	});

	it('contains no empty terms', () => {
		for (const term of SCAM_TERMS) {
			expect(term.length).toBeGreaterThan(0);
		}
	});
});

describe('findScamTerms', () => {
	it('matches regardless of letter case', () => {
		expect(findScamTerms('CHỈ CẦN ĐẶT CỌC 200.000đ')).toEqual(['đặt cọc']);
	});

	it('returns every matching term once, in list order', () => {
		expect(findScamTerms('Đặt cọc trước, việc nhẹ lương cao')).toEqual([
			'đặt cọc',
			'cọc trước',
			'việc nhẹ lương cao'
		]);
	});

	it('finds terms spread across title and description', () => {
		expect(findScamTerms('Tuyển dụng Telegram | nộp phí để nhận việc')).toEqual([
			'nộp phí',
			'telegram'
		]);
	});

	it('returns an empty list for a clean posting', () => {
		expect(findScamTerms('Phục vụ quán cà phê, trả lương theo giờ.')).toEqual([]);
	});

	it('does not flag the legitimate phrase "miễn phí đào tạo"', () => {
		expect(findScamTerms('Miễn phí đào tạo cho sinh viên mới')).toEqual([]);
	});
});
