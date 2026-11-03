import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '#lib/server/api/auth.ts';
import { handleApiError } from '#lib/server/api/errors.ts';
import { toCategory } from '#lib/server/api/mappers.ts';
import { parseJson, parseParams } from '#lib/server/api/validation.ts';
import { db } from '#lib/server/db/index.ts';
import { deleteCategory, updateCategory } from '#lib/server/services/admin.ts';

const paramsSchema = z.object({
	categoryId: z.uuid()
});

// At least one editable field must be present; an empty body would otherwise be
// a silent no-op.
const bodySchema = z
	.object({
		name: z.string().trim().min(1).max(100).optional(),
		isActive: z.boolean().optional()
	})
	.refine((body) => body.name !== undefined || body.isActive !== undefined, {
		message: 'Provide a name, an active state, or both.'
	});

/** PATCH /admin/categories/{categoryId} - adminUpdateCategory */
export const PATCH: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);
		const { categoryId } = parseParams(event.params, paramsSchema);
		const body = await parseJson(event.request, bodySchema);

		const category = await updateCategory(db, categoryId, {
			name: body.name,
			isActive: body.isActive
		});

		return Response.json(toCategory(category));
	} catch (error) {
		return handleApiError(error);
	}
};

/** DELETE /admin/categories/{categoryId} - adminDeleteCategory */
export const DELETE: RequestHandler = async (event) => {
	try {
		requireRole(event.locals, ['ADMIN']);
		const { categoryId } = parseParams(event.params, paramsSchema);

		await deleteCategory(db, categoryId);

		return new Response(null, { status: 204 });
	} catch (error) {
		return handleApiError(error);
	}
};
