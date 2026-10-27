import type { UserRole } from './auth.ts';

export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DELETED';

export type UserMeSource = {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	status: AccountStatus;
	image?: string | null;
	createdAt: Date | string;
};

export type UserProfileSource = {
	phone: string | null;
	avatarKey: string | null;
} | null;

export type UserMe = {
	id: string;
	email: string;
	role: UserRole;
	status: AccountStatus;
	fullName: string;
	phone: string | null;
	avatarUrl: string | null;
	createdAt: string;
};

export type CategorySource = {
	id: string;
	name: string;
	isActive: boolean;
};

export type Category = {
	id: string;
	name: string;
	isActive: boolean;
};

/** Maps a user and their optional common profile to the public account shape. */
export function toUserMe(user: UserMeSource, profile: UserProfileSource): UserMe {
	let avatarUrl = user.image ?? null;

	if (profile?.avatarKey) {
		avatarUrl = `/api/v1/users/${user.id}/avatar`;
	}

	return {
		id: user.id,
		email: user.email,
		role: user.role,
		status: user.status,
		fullName: user.name,
		phone: profile?.phone ?? null,
		avatarUrl,
		createdAt: toIsoString(user.createdAt)
	};
}

/** Maps a category row to the public category shape. */
export function toCategory(category: CategorySource): Category {
	return {
		id: category.id,
		name: category.name,
		isActive: category.isActive
	};
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}
